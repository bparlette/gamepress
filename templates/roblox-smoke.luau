-- Headless smoke test run by `gamepress roblox-ship --test`. error() fails the ship; print() shows in the logs.
local missing = {}
for _, name in ipairs({ "Workspace", "ReplicatedStorage", "ServerScriptService" }) do
	if not game:FindService(name) then table.insert(missing, name) end
end
assert(#missing == 0, "missing services: " .. table.concat(missing, ","))
local scripts = 0
for _, d in ipairs(game:GetDescendants()) do
	if d:IsA("LuaSourceContainer") then scripts += 1 end
end
print("scripts:", scripts, "parts:", #workspace:GetDescendants())
assert(scripts > 0, "place has no scripts")
-- add game-specific checks here: spawn locations, remote events, pet data tables, etc.
