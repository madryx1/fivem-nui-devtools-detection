RegisterNUICallback('devtools', function(_, cb)
    TriggerServerEvent('nui_devtools_guard:detected')
    cb('ok')
end)
