#!/usr/bin/env python3
"""
Roblox Studio MCP: 100-Scene Batch Generator
Orchestrates AI Text-to-Scene generation across 100 scenes with rate-limiting,
coordinate volume offsetting, and automatic off-screen camera captures.
"""

import os
import sys
import time
import json
import subprocess

STUDIO_MCP_BIN = "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP"
PACE_DELAY_SECONDS = 15  # Cooldown between scene generations to prevent rate-limits

class StudioClient:
    def __init__(self):
        self.proc = subprocess.Popen(
            [STUDIO_MCP_BIN],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        self.req_id = 0
        self.send("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "batch-scene-builder", "version": "1.0"}
        })

    def send(self, method, params):
        self.req_id += 1
        req = {
            "jsonrpc": "2.0",
            "id": self.req_id,
            "method": method if "/" in method else f"tools/call",
            "params": {"name": method, "arguments": params} if "/" not in method else params
        }
        self.proc.stdin.write(json.dumps(req) + "\n")
        self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        return json.loads(line) if line else {}

    def close(self):
        if self.proc:
            self.proc.terminate()

def get_target_studio_id(client):
    res = client.send("list_roblox_studios", {})
    text = res.get("result", {}).get("content", [{}])[0].get("text", "{}")
    studios = json.loads(text).get("studios", [])
    for s in studios:
        if s.get("name"):
            return s["id"], s["name"]
    return None, None

def run_batch(prompts_file, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    with open(prompts_file, "r") as f:
        scenes = json.load(f)

    client = StudioClient()
    studio_id, studio_name = get_target_studio_id(client)
    if not studio_id:
        print("No active Roblox Studio place detected.")
        client.close()
        return

    print(f"Connected to Studio place: {studio_name} ({studio_id})")
    print(f"Total scenes to generate: {len(scenes)}")

    # Spatially arrange each scene in a 10x10 grid (spacing 100 studs apart)
    grid_cols = 10
    spacing = 100.0

    for idx, sc in enumerate(scenes):
        rank = sc.get("rank", idx + 1)
        title = sc.get("title", f"Scene_{rank}")
        prompt = sc.get("prompt")

        col = idx % grid_cols
        row = idx // grid_cols
        pos_x = (col - grid_cols / 2) * spacing
        pos_z = (row - grid_cols / 2) * spacing
        pos_y = 10.0

        print(f"\n[{idx+1}/{len(scenes)}] Generating #{rank}: {title} at ({pos_x:.0f}, {pos_y:.0f}, {pos_z:.0f})...")

        gen_res = client.send("generate_scene", {
            "studio_id": studio_id,
            "textPrompt": prompt,
            "boundingBoxPosition": {"x": pos_x, "y": pos_y, "z": pos_z},
            "boundingBoxSize": {"x": 70.0, "y": 30.0, "z": 70.0}
        })

        is_err = gen_res.get("result", {}).get("isError", False)
        if is_err:
            print(f"  Warning: Generation returned error: {gen_res}")
        else:
            print(f"  Generation finished successfully.")

        # Capture render snapshot
        cam_pos = [pos_x + 35, pos_y + 18, pos_z + 42]
        look_pos = [pos_x, pos_y, pos_z]
        cap_res = client.send("screen_capture", {
            "studio_id": studio_id,
            "capture_id": f"Scene_{rank}",
            "camera_position": cam_pos,
            "look_at_position": look_pos
        })

        for content in cap_res.get("result", {}).get("content", []):
            if content.get("type") == "image":
                import base64
                img_path = os.path.join(output_dir, f"scene_{rank:03d}.png")
                with open(img_path, "wb") as f_img:
                    f_img.write(base64.b64decode(content["data"]))
                print(f"  Snapshot saved to {img_path}")

        print(f"Pacing cooldown ({PACE_DELAY_SECONDS}s)...")
        time.sleep(PACE_DELAY_SECONDS)

    client.close()
    print("\nBatch generation complete!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 batch_scene_generator.py <prompts.json> <output_dir>")
        sys.exit(1)
    run_batch(sys.argv[1], sys.argv[2])
