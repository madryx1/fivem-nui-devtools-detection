fx_version 'cerulean'
games { 'gta5', 'rdr3' }

description 'NUI DevTools detection that works on CEF 144'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html'
}

client_script 'client.lua'
server_script 'server.lua'
