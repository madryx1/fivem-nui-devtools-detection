local action = GetConvar('nui_devtools_guard_action', 'kick')
local reported = {}

RegisterNetEvent('nui_devtools_guard:detected', function()
    local src = source
    if reported[src] or IsPlayerAceAllowed(src, 'nui_devtools_guard.bypass') then return end
    reported[src] = true

    print(('[nui_devtools_guard] %s (id %s) opened NUI DevTools'):format(GetPlayerName(src), src))

    if action == 'kick' then
        DropPlayer(src, 'NUI DevTools are not allowed on this server.')
    end
end)

AddEventHandler('playerDropped', function()
    reported[source] = nil
end)
