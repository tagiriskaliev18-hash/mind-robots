#!/usr/bin/env python3
"""
tools/build_g1_glb.py
Converts Google DeepMind MuJoCo Menagerie Unitree G1 MJCF/STL model to an optimized Three.js GLB.
"""

import os
import sys
import struct
import json
import xml.etree.ElementTree as ET
import numpy as np

try:
    import trimesh
    import fast_simplification
except ImportError as e:
    print(f"Missing package: {e}")
    sys.exit(1)

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache_g1")
XML_PATH = os.path.join(CACHE_DIR, "g1_with_hands.xml")
OUTPUT_GLB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "model.glb"))

def parse_model():
    tree = ET.parse(XML_PATH)
    root = tree.getroot()
    
    # Stand keyframe qpos
    stand_key = root.find(".//keyframe/key[@name='stand']")
    stand_qpos = [float(x) for x in stand_key.attrib["qpos"].split()]
    
    joint_angles = {}
    q_idx = 7  # Skip root freejoint (3 pos + 4 quat)
    for j in root.findall(".//joint"):
        jname = j.attrib.get("name")
        if jname:
            joint_angles[jname] = stand_qpos[q_idx]
            q_idx += 1
            
    # Apply natural, museum-grade arm posture (calm humanoid heroic silhouette)
    # Arms hanging naturally along sides with subtle ~20° forward bend
    joint_angles["left_shoulder_pitch_joint"] = 0.15
    joint_angles["left_shoulder_roll_joint"] = 0.18
    joint_angles["left_shoulder_yaw_joint"] = 0.0
    joint_angles["left_elbow_joint"] = 1.35
    joint_angles["left_wrist_roll_joint"] = 0.0
    joint_angles["left_wrist_pitch_joint"] = 0.0
    joint_angles["left_wrist_yaw_joint"] = 0.0
    
    joint_angles["right_shoulder_pitch_joint"] = 0.15
    joint_angles["right_shoulder_roll_joint"] = -0.18
    joint_angles["right_shoulder_yaw_joint"] = 0.0
    joint_angles["right_elbow_joint"] = 1.35
    joint_angles["right_wrist_roll_joint"] = 0.0
    joint_angles["right_wrist_pitch_joint"] = 0.0
    joint_angles["right_wrist_yaw_joint"] = 0.0

    # Mesh filename map from <asset>
    mesh_file_map = {}
    for m in root.findall(".//asset/mesh"):
        f = m.attrib["file"]
        n = m.attrib.get("name", f.replace(".STL", "").replace(".stl", ""))
        mesh_file_map[n] = f
        
    return root, joint_angles, mesh_file_map

def quat_to_mat(q):
    w, x, y, z = q
    return np.array([
        [1 - 2*(y*y + z*z),     2*(x*y - z*w),     2*(x*z + y*w)],
        [    2*(x*y + z*w), 1 - 2*(x*x + z*z),     2*(y*z - x*w)],
        [    2*(x*z - y*w),     2*(y*z + x*w), 1 - 2*(x*x + y*y)]
    ], dtype=np.float64)

def axis_angle_to_mat(axis, angle):
    v = np.array(axis, dtype=np.float64)
    norm = np.linalg.norm(v)
    if norm < 1e-8:
        return np.eye(3)
    x, y, z = v / norm
    c, s = np.cos(angle), np.sin(angle)
    C = 1 - c
    return np.array([
        [c + x*x*C,     x*y*C - z*s, x*z*C + y*s],
        [y*x*C + z*s, c + y*y*C,     y*z*C - x*s],
        [z*x*C - y*s, z*y*C + x*s, c + z*z*C    ]
    ], dtype=np.float64)

# Decimation targets per mesh to stay within 65k-85k triangles total and ~2.0-2.5 MB file size
def get_target_faces(name, orig_faces):
    if "logo" in name:
        return orig_faces
    if "palm" in name:
        return min(orig_faces, 2800)
    if "thumb_0" in name:
        return orig_faces
    if "thumb" in name or "middle" in name or "index" in name:
        return min(orig_faces, 650)
    if "torso" in name:
        return min(orig_faces, 9500)
    if "contour" in name:
        return min(orig_faces, 6500)
    if "pelvis" in name:
        return min(orig_faces, 4200)
    if "head" in name:
        return min(orig_faces, 6200)
    if "knee" in name:
        return min(orig_faces, 7600)
    if "ankle_roll" in name:
        return min(orig_faces, 3400)
    if "shoulder_roll" in name:
        return min(orig_faces, 2800)
    if "shoulder_yaw" in name or "hip_yaw" in name:
        return min(orig_faces, 2400)
    if "wrist_roll" in name or "wrist_yaw" in name:
        return min(orig_faces, 2000)
    if "waist_yaw" in name:
        return min(orig_faces, 3400)
    return min(orig_faces, max(900, int(orig_faces * 0.55)))

def main():
    print("--- Unitree G1 GLB Pipeline ---")
    root, joint_angles, mesh_file_map = parse_model()
    
    transformed_raw = {}
    
    def walk(body, p_par, R_par):
        p_rel = np.array([float(x) for x in body.attrib.get("pos", "0 0 0").split()])
        q_rel = np.array([float(x) for x in body.attrib.get("quat", "1 0 0 0").split()])
        R_rel = quat_to_mat(q_rel)
        
        R_joints = np.eye(3)
        for j in body.findall("joint"):
            jname = j.attrib.get("name")
            if jname and jname in joint_angles:
                axis = [float(x) for x in j.attrib.get("axis", "0 0 1").split()]
                ang = joint_angles[jname]
                R_joints = R_joints @ axis_angle_to_mat(axis, ang)
                
        p_body = p_par + R_par @ p_rel
        R_body = R_par @ R_rel @ R_joints
        
        for g in body.findall("geom"):
            if g.attrib.get("class") not in ("collision", "foot"):
                mname = g.attrib.get("mesh")
                if mname and mname in mesh_file_map:
                    gp = np.array([float(x) for x in g.attrib.get("pos", "0 0 0").split()])
                    gq = np.array([float(x) for x in g.attrib.get("quat", "1 0 0 0").split()])
                    gR = quat_to_mat(gq)
                    
                    stl_path = os.path.join(CACHE_DIR, mesh_file_map[mname])
                    raw_mesh = trimesh.load(stl_path, process=True)
                    raw_mesh.merge_vertices()
                    
                    # Decimate cleanly
                    target_f = get_target_faces(mname, len(raw_mesh.faces))
                    if target_f < len(raw_mesh.faces):
                        v_dec, f_dec = fast_simplification.simplify(
                            raw_mesh.vertices, raw_mesh.faces, target_count=target_f
                        )
                    else:
                        v_dec, f_dec = raw_mesh.vertices, raw_mesh.faces
                        
                    # Transform to MuJoCo world
                    v_body = (gR @ v_dec.T).T + gp
                    v_world = (R_body @ v_body.T).T + p_body
                    
                    # Three.js coordinates: (x_three, y_three, z_three) = (x_mj, z_mj, -y_mj)
                    v_three = np.empty_like(v_world)
                    v_three[:, 0] = v_world[:, 0]
                    v_three[:, 1] = v_world[:, 2]
                    v_three[:, 2] = -v_world[:, 1]
                    
                    transformed_raw[mname] = (v_three, f_dec)
                    
        for ch in body.findall("body"):
            walk(ch, p_body, R_body)

    for b in root.find("worldbody").findall("body"):
        walk(b, np.array([0, 0, 0]), np.eye(3))
        
    # Group fingers + palm per hand into single cohesive mesh
    left_hand_parts = [
        "left_hand_palm_link", "left_hand_thumb_0_link", "left_hand_thumb_1_link", "left_hand_thumb_2_link",
        "left_hand_middle_0_link", "left_hand_middle_1_link", "left_hand_index_0_link", "left_hand_index_1_link"
    ]
    right_hand_parts = [
        "right_hand_palm_link", "right_hand_thumb_0_link", "right_hand_thumb_1_link", "right_hand_thumb_2_link",
        "right_hand_middle_0_link", "right_hand_middle_1_link", "right_hand_index_0_link", "right_hand_index_1_link"
    ]
    
    def merge_submeshes(parts):
        v_list, f_list = [], []
        off = 0
        for p in parts:
            v, f = transformed_raw[p]
            v_list.append(v)
            f_list.append(f + off)
            off += len(v)
        return np.vstack(v_list), np.vstack(f_list)

    final_parts = {}
    final_parts["left_hand_dex3"] = merge_submeshes(left_hand_parts)
    final_parts["right_hand_dex3"] = merge_submeshes(right_hand_parts)
    
    for name, data in transformed_raw.items():
        if name not in left_hand_parts and name not in right_hand_parts:
            final_parts[name] = data
            
    # Compute overall bounding box for normalization: min(y)=0, max(y)=1.32, center(x)=0, center(z)=0
    all_verts = np.vstack([v for v, _ in final_parts.values()])
    min_x, min_y, min_z = all_verts.min(axis=0)
    max_x, max_y, max_z = all_verts.max(axis=0)
    
    orig_h = max_y - min_y
    scale = 1.32 / orig_h
    center_x = 0.5 * (min_x + max_x)
    center_z = 0.5 * (min_z + max_z)
    
    # Materials specification
    dark_parts = {
        "head_link", "logo_link", "pelvis", "waist_yaw_link", "waist_roll_link",
        "left_shoulder_pitch_link", "right_shoulder_pitch_link",
        "left_shoulder_yaw_link", "right_shoulder_yaw_link",
        "left_elbow_link", "right_elbow_link",
        "left_wrist_roll_link", "right_wrist_roll_link",
        "left_wrist_pitch_link", "right_wrist_pitch_link",
        "left_hip_pitch_link", "right_hip_pitch_link",
        "left_hip_yaw_link", "right_hip_yaw_link",
        "left_ankle_pitch_link", "right_ankle_pitch_link",
        "left_ankle_roll_link", "right_ankle_roll_link"
    }
    
    mat_dark = trimesh.visual.material.PBRMaterial(
        name="dark_joint",
        baseColorFactor=[0.16, 0.17, 0.20, 1.0],
        roughnessFactor=0.58,
        metallicFactor=0.62
    )
    mat_light = trimesh.visual.material.PBRMaterial(
        name="light_shell",
        baseColorFactor=[0.90, 0.89, 0.86, 1.0],
        roughnessFactor=0.56,
        metallicFactor=0.0
    )
    
    scene = trimesh.Scene()
    
    stats = []
    total_triangles = 0
    
    # Process each mesh: apply normalization, crease-angle normals (>42° split), assign material
    for name in sorted(final_parts.keys()):
        v, f = final_parts[name]
        v_norm = v.copy()
        v_norm[:, 0] = (v_norm[:, 0] - center_x) * scale
        v_norm[:, 1] = (v_norm[:, 1] - min_y) * scale
        v_norm[:, 2] = (v_norm[:, 2] - center_z) * scale
        
        base_mesh = trimesh.Trimesh(vertices=v_norm, faces=f, process=True)
        base_mesh.update_faces(base_mesh.nondegenerate_faces())
        
        # Apply crease angle normal computation (42 degrees)
        smooth_mesh = trimesh.graph.smooth_shade(base_mesh, angle=np.radians(42), facet_minarea=None)
        
        # Ensure normals are strictly unit length with no zero vectors
        v_normals = smooth_mesh.vertex_normals.copy()
        norms = np.linalg.norm(v_normals, axis=1, keepdims=True)
        zero_mask = (norms < 1e-6).flatten()
        if np.any(zero_mask):
            v_normals[zero_mask] = [0.0, 1.0, 0.0]
        v_normals[~zero_mask] /= norms[~zero_mask]
        smooth_mesh._cache.cache['vertex_normals'] = v_normals
        
        is_dark = name in dark_parts
        smooth_mesh.visual.material = mat_dark if is_dark else mat_light
        
        scene.add_geometry(smooth_mesh, node_name=name, geom_name=name)
        
        bmin = smooth_mesh.vertices.min(axis=0)
        bmax = smooth_mesh.vertices.max(axis=0)
        bcenter = 0.5 * (bmin + bmax)
        tri_count = len(smooth_mesh.faces)
        total_triangles += tri_count
        stats.append({
            "name": name,
            "material": "dark_joint" if is_dark else "light_shell",
            "triangles": tri_count,
            "center": bcenter.round(4).tolist(),
            "min": bmin.round(4).tolist(),
            "max": bmax.round(4).tolist()
        })

    # Export initial GLB bytes
    os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)
    raw_glb_bytes = scene.export(file_type="glb", include_normals=True)
    
    # Post-process GLB to guarantee bufferView.target compliance (ARRAY_BUFFER & ELEMENT_ARRAY_BUFFER)
    magic, ver, length = struct.unpack('<III', raw_glb_bytes[:12])
    c_len, c_type = struct.unpack('<II', raw_glb_bytes[12:20])
    gltf_json = json.loads(raw_glb_bytes[20:20+c_len])
    bin_chunk = raw_glb_bytes[20+c_len:]
    
    accessors = gltf_json.get("accessors", [])
    buffer_views = gltf_json.get("bufferViews", [])
    
    for mesh in gltf_json.get("meshes", []):
        for prim in mesh.get("primitives", []):
            if "indices" in prim:
                acc_id = prim["indices"]
                bv_id = accessors[acc_id]["bufferView"]
                buffer_views[bv_id]["target"] = 34963  # ELEMENT_ARRAY_BUFFER
            for attr_name, acc_id in prim.get("attributes", {}).items():
                bv_id = accessors[acc_id]["bufferView"]
                buffer_views[bv_id]["target"] = 34962  # ARRAY_BUFFER

    new_json_bytes = json.dumps(gltf_json, separators=(',', ':')).encode("utf-8")
    pad = (4 - (len(new_json_bytes) % 4)) % 4
    new_json_bytes += b' ' * pad
    
    new_total_len = 12 + 8 + len(new_json_bytes) + len(bin_chunk)
    glb_header = struct.pack('<III', magic, ver, new_total_len)
    json_chunk_header = struct.pack('<II', len(new_json_bytes), c_type)
    
    with open(OUTPUT_GLB, "wb") as f_out:
        f_out.write(glb_header)
        f_out.write(json_chunk_header)
        f_out.write(new_json_bytes)
        f_out.write(bin_chunk)
        
    final_file_size = os.path.getsize(OUTPUT_GLB)
    file_size_mb = final_file_size / (1024 * 1024)
    print(f"Exported: {OUTPUT_GLB}")
    print(f"File size: {file_size_mb:.2f} MB ({final_file_size} bytes)")
    print(f"Total meshes: {len(stats)}")
    print(f"Total triangles: {total_triangles}")
    print("\n--- Mesh Summary ---")
    for s in stats:
        print(f"{s['name']:28s} [{s['material']:11s}] {s['triangles']:5d} tris | center: {s['center']} | bounds: [{s['min']}, {s['max']}]")
        
    return file_size_mb, total_triangles, stats

if __name__ == "__main__":
    main()
