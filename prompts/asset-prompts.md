# Mind Unitree G1 — Build-Story Asset & Prompt Log

Generated via **Higgsfield MCP** (`nano_banana_pro` 2K image-reference editing + `seedance_2_0` `std` / `seedance_2_5` `omni_reference` First/Last-Frame video legs) on Tagir's Ultra Unlimited plan (`use_unlim: true`, **0 credits spent**).
Machine-readable job IDs, timestamps, and media references are recorded in `prompts/asset-log.jsonl`.

## Style Lock (`build-story-scroll-site` + Mind Palette)
- **Camera & Lens:** ARRI Alexa 65 studio prime, shallow depth of field, motorized cinema slider dolly-in without cuts.
- **Environment:** Dark `#09090f` brushed-obsidian robotics laboratory, single soft overhead diffuser, calm empty lower-left third (desktop `16:9`) and calm empty lower-40% floor (mobile `9:16` portrait) reserved for typography.
- **Lighting:** Neutral cool studio key + violet (`#7B2FF7`) left rim + electric blue (`#1E90FF`) right rim + `#00F5FF` cyan wireframe/visor/fiber-optic accent.

## Keyframe Sequence (`K0 → K7`, Desktop `16:9` & Mobile `9:16`)
1. **`05_master` (Master Anchor Generated First):** Full-body finished Unitree G1-class humanoid robot (matte pearl-white torso/limb shells, dark anodized gunmetal joints, smoked-black glass visor with thin `#00F5FF` cyan bar).
2. **`02_skeleton` (Reference Edit of `05_master`):** Pixel-locked background/pose; outer shells stripped to bare precision-machined dark gunmetal & carbon endoskeleton.
3. **`00_wireframe` (Reference Edit of `05_master`):** Pixel-locked background/pose; physical robot replaced by glowing `#00F5FF` cyan 3D CAD hologram blueprint with subtle floor reflection.
4. **`01_base` (Reference Edit of `05_master` + `02_skeleton`):** Feet, ankles, shins, knees, and pelvis materialized in solid dark gunmetal; upper torso/arms/head remain `#00F5FF` wireframe.
5. **`03_actuators` (Reference Edit of `02_skeleton` + `05_master`):** Copper-wound PMSM motor stators, harmonic drives, and chest 13S battery core mounted inside the open frame.
6. **`04_wired` (Reference Edit of `05_master` + `02_skeleton`):** Matte pearl-white limb shells mounted; chest PCB, `#00F5FF` fiber-optic harnesses, and head stereo/LiDAR optics open before sealing.
7. **`06_visor_entry` (Macro Reference of `05_master`):** Extreme macro push into the smoked-black dome visor showing twin sapphire stereo lenses, solid-state 3D LiDAR prism, and `#00F5FF` optical bar.
8. **`07_neural_core` (Macro Reference of `05_master`):** Interior macro architecture inside the brushed-titanium VLA silicon compute bay with `#00F5FF` circuit traces and calm dark foreground pocket.

## FLF Video Legs (`c01..c07` / `s_c03..s_c05` Desktop `16:9`, `s_m01..s_m05` / `m06..m07` Mobile `9:16`)
- Assembly legs generated from pixel-locked static-tripod start/end pairs (`seedance_2_0` `std` & `seedance_2_5` `omni_reference`, `duration: 4`, `resolution: "720p"`, `generate_audio: false`, `use_unlim: true`) so `start_image` and `end_image` match within `MAE ~ 5/255` without camera zoom overshoot.
- Sub-pixel Lanczos continuous exponential camera dolly (`z: 1.00 → 1.415` desktop, `z: 1.00 → 1.342` mobile) applied across the stitched assembly sequence in `tools/build_films.py` so the camera glides seamlessly into the macro visor entry (`06_visor_entry`) and VLA silicon neural core (`07_neural_core`).
- Verified with `tools/film.py seams`, graded with `tools/film.py grade`, and exported to `assets/frames/desktop/` (`280` WebP frames, `≤ 25 MB`) and `assets/frames/mobile/` (`174` portrait `720×1280` WebP frames, `≤ 8 MB`).
