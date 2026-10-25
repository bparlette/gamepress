-- Capture driver: flings one of every pet type with the chase cam and name card (see CaptureMode.client.luau).
-- Run in play mode with ReplicatedStorage attribute CaptureMode = true (set it from the edit-mode command bar first):
--   game.ReplicatedStorage:SetAttribute("CaptureMode", true)
-- Via the Studio MCP:  run_script_in_play_mode tools/capture_throws.lua   (press record first).
-- Prints "THROW <t> <pet>" per throw so a cut can be matched to the footage.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local PP = require(game.ServerScriptService.Server.PetPhysics)

while #Players:GetPlayers() == 0 do
	task.wait(0.2)
end
local plr = Players:GetPlayers()[1]
task.wait(8) -- let the HUD, pets and capture mode settle
local petsFolder = workspace:WaitForChild("Pets")

local target = RS:FindFirstChild("CaptureTarget") or Instance.new("ObjectValue")
target.Name = "CaptureTarget"
target.Parent = RS

local TIER_ORDER = { Common = 1, Rare = 2, Epic = 3, Legendary = 4, Mythic = 5, Divine = 6 }
local PD = require(game.ReplicatedStorage.Shared.PetDefinitions)

-- one pet per type, commons first so the reveal builds to the Divine
local byId: { [string]: Model } = {}
for _, m in petsFolder:GetChildren() do
	local id = m:GetAttribute("PetId")
	if type(id) == "string" and not byId[id] and m.PrimaryPart then
		byId[id] = m
	end
end
local list = {}
for id, m in byId do
	local def = PD.get(id)
	table.insert(
		list,
		{ id = id, model = m, name = def and def.displayName or id, tier = def and def.tier or "Common" }
	)
end
table.sort(list, function(a, b)
	local ta, tb = TIER_ORDER[a.tier] or 0, TIER_ORDER[b.tier] or 0
	if ta ~= tb then
		return ta < tb
	end
	return a.name < b.name
end)
print("PET TYPES FOUND", #list)

local function flatDir(from: Vector3, to: Vector3): Vector3
	local d = Vector3.new(to.X - from.X, 0, to.Z - from.Z)
	return if d.Magnitude < 0.1 then Vector3.new(1, 0, 0) else d.Unit
end

local t0 = os.clock()
for i, e in list do
	local body = e.model.PrimaryPart
	if not body then
		continue
	end
	-- stand the character beside the pet (fling needs reach), aim at the nearest other pet
	local char = plr.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if root and root:IsA("BasePart") then
		root.CFrame = CFrame.new(body.Position + Vector3.new(0, 3, 6))
	end
	local other, best = nil, math.huge
	for _, m in petsFolder:GetChildren() do
		local b = m.PrimaryPart
		if m ~= e.model and b then
			local d = (b.Position - body.Position).Magnitude
			if d > 12 and d < best then
				other, best = b, d
			end
		end
	end
	local dir = flatDir(body.Position, other and other.Position or body.Position + Vector3.new(1, 0, 0))
	RS:SetAttribute("CaptureText", string.upper(e.name) .. "|" .. string.upper(e.tier))
	target.Value = e.model
	task.wait(0.9)
	local ok, err = pcall(PP.requestFling, plr, e.model, dir, 0.3 + 0.3 * ((i % 3) / 2))
	print(
		string.format(
			"THROW %.1f %s (%s) ok=%s %s",
			os.clock() - t0,
			e.name,
			e.tier,
			tostring(ok),
			ok and "" or tostring(err)
		)
	)
	task.wait(3.6)
end
target.Value = nil
RS:SetAttribute("CaptureText", "")
task.wait(2)
print("DONE", string.format("%.1f", os.clock() - t0))
