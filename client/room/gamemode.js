// gamemode.js
import { setupTeams } from './default_teams.js';
import { CONFIG } from './options.js';

// Глобальное хранилище данных игроков
const players = new Map(); 
let serverStartTime = Date.now();
let firstPlayerAssigned = false;
let colorIndex = 0;

// 1. Инициализация команд (запускаем сразу)
setupTeams();

// 2. Вход игрока
RoomAPI.OnPlayerJoin.Add(function(player) {
    const roomId = players.size + 1;
    
    const pData = {
        id: player.Id,
        roomId: roomId,
        coins: 0,
        kills: 0,
        hp: 100,
        statuses: [],
        isAdmin: false,
        canFly: false,
        hasAllWeapons: false,
        canBuild: false
    };

    players.set(player.Id, pData);

    // Админка только для первого
    if (!firstPlayerAssigned) {
        pData.isAdmin = true;
        pData.canFly = true;
        pData.hasAllWeapons = true;
        pData.canBuild = true;
        firstPlayerAssigned = true;
        player.Chat.SendMessage("🎉 Поздравляем! Вы главный администратор сервера.");
    }

    // Гарантируем команду Чёрных
    const blackTeam = Teams.Get('Black');
    if (blackTeam) player.Team = blackTeam;

    updateOnlineList();
});

// 3. Выход игрока
RoomAPI.OnPlayerLeave.Add(function(player) {
    players.delete(player.Id);
    updateOnlineList();
});

// 4. Логика Зон
RoomAPI.OnPlayerEnterZone.Add(function(player, zone) {
    const tag = zone.Tag;
    const name = zone.Name;
    const pData = players.get(player.Id);
    if (!pData) return;

    // --- ФАРМ (тег: farm) ---
    if (tag === "farm") {
        const amount = parseInt(name);
        if (amount > 0) {
            pData.coins += amount;
            player.Chat.SendMessage(`+${amount} монет! Всего: ${pData.coins}`);
        }
    }

    // --- МАГАЗИН ОРУЖИЯ (тег: weapon) ---
    // Формат имени: ID@Цена (например, 0@100)
    if (tag === "weapon") {
        const parts = name.split('@');
        if (parts.length === 2) {
            const itemId = parseInt(parts);
            const price = parseInt(parts);
            if (pData.coins >= price) {
                pData.coins -= price;
                giveItem(player, itemId);
                player.Chat.SendMessage("Предмет получен!");
            } else {
                player.Chat.SendMessage("❌ Недостаточно средств!");
            }
        }
    }

    // --- МАГАЗИН ЗДОРОВЬЯ (тег: xp) ---
    // Формат имени: HP@Цена (например, 50@200)
    if (tag === "xp") {
        const parts = name.split('@');
        if (parts.length === 2) {
            const hpAmount = parseInt(parts);
            const price = parseInt(parts);
            if (pData.coins >= price) {
                pData.coins -= price;
                pData.hp = Math.min(100, pData.hp + hpAmount);
                player.Chat.SendMessage("❤️ Здоровье восстановлено!");
            } else {
                player.Chat.SendMessage("❌ Недостаточно средств!");
            }
        }
    }

    // --- МАГАЗИН СТАТУСОВ (тег: status) ---
    // Формат имени: Цвет@Имя@Цена (например, red@VIP@100)
    if (tag === "status") {
        const parts = name.split('@');
        if (parts.length === 3) {
            const color = parts;
            const statusName = parts;
            const price = parseInt(parts);
            
            if (pData.coins >= price) {
                pData.coins -= price;
                pData.statuses.push({ name: statusName, color: color });
                updateUIStatus(player, pData);
                player.Chat.SendMessage(`✨ Статус "\${statusName}" получен!`);
            } else {
                player.Chat.SendMessage("❌ Недостаточно средств!");
            }
        }
    }

    // --- ЗОНА ДОСТУПА (тег: status2) ---
    // Формат имени: Цвет@Имя (например, red@VIP)
    if (tag === "status2") {
        const parts = name.split('@');
        if (parts.length >= 2) {
            const requiredName = parts;
            const hasStatus = pData.statuses.some(s => s.name === requiredName);
            
            if (!hasStatus) {
                player.Spawns.Spawn(); // Телепорт на спавн
                player.Chat.SendMessage("🚫 Доступ запрещен! Нужен статус: " + requiredName);
            }
        }
    }

    // --- ТЕЛЕПОРТ ПО КООРДИНАТАМ (тег: tp) ---
    // Формат имени: X@Y@Z (например, 10@20@30)
    if (tag === "tp") {
        const parts = name.split('@');
        if (parts.length === 3) {
            const x = parseInt(parts);
            const y = parseInt(parts);
            const z = parseInt(parts);
            player.Position = new Vector3(x, y, z);
        }
    }

    // --- ПОДСКАЗКА (тег: hint) ---
    if (tag === "hint") {
        player.Chat.SendMessage(name);
    }
});

// 5. Чат-команды
RoomAPI.OnChatMessage.Add(function(player, message) {
    if (!message.startsWith('/')) return;
    
    const args = message.split(' ');
    const cmd = args.substring(1).toLowerCase();
    const pData = players.get(player.Id);
    if (!pData) return;

    // /help
    if (cmd === 'help') {
        player.Chat.SendMessage("/tp(ID) - тп к игроку | /pop(Текст) - всем | /spawn(ID) - на спавн | /adm(ID) - админка | /ban(ID) - бан");
    }

    // /tp(ID)
    if (cmd === 'tp') {
        const match = args.match(/$(\d+)$/);
        if (match) {
            const targetId = parseInt(match);
            const target = getPlayerByRoomId(targetId);
            if (target) player.Position = target.Player.Position;
        }
    }

    // /pop(Текст)
    if (cmd === 'pop') {
        const text = message.substring(message.indexOf('(') + 1, message.lastIndexOf(')'));
        RoomAPI.BroadcastMessage(text, { r: 255, g: 255, b: 255 });
    }

    // /spawn(ID)
    if (cmd === 'spawn') {
        const match = args.match(/$(\d+)$/);
        if (match) {
            const targetId = parseInt(match);
            const target = getPlayerByRoomId(targetId);
            if (target) target.Player.Spawns.Spawn();
        }
    }

    // /adm(ID) - ТОЛЬКО АДМИН
    if (cmd === 'adm' && pData.isAdmin) {
        const match = args.match(/$(\d+)$/);
        if (match) {
            const targetId = parseInt(match);
            const targetData = getPlayerDataByRoomId(targetId);
            if (targetData) {
                targetData.isAdmin = true;
                targetData.canFly = true;
                targetData.hasAllWeapons = true;
                targetData.canBuild = true;
                player.Chat.SendMessage("Админка выдана!");
            }
        }
    }

    // /ban(ID) - ТОЛЬКО АДМИН
    if (cmd === 'ban' && pData.isAdmin) {
        const match = args.match(/$(\d+)$/);
        if (match) {
            const targetId = parseInt(match);
            const target = getPlayerByRoomId(targetId);
            if (target) target.Player.Kick("Вы забанены администратором");
        }
    }
});

// 6. Вспомогательные функции
function giveItem(player, id) {
    // Здесь должна быть логика выдачи предмета через API игры
    console.log(`Выдача предмета ID: \${id}`);
    // Пример: player.Inventory.Add(id); 
}

function getPlayerByRoomId(roomId) {
    for (let [id, data] of players.entries()) {
        if (data.roomId === roomId) {
            return { Player: RoomAPI.GetPlayer(id), Data: data };
        }
    }
    return null;
}

function getPlayerDataByRoomId(roomId) {
    for (let [id, data] of players.entries()) {
        if (data.roomId === roomId) return data;
    }
    return null;
}

function updateUIStatus(player, data) {
    if (data.statuses.length > 0) {
        const lastStatus = data.statuses[data.statuses.length - 1];
        // Логика изменения цвета ника или тега в UI
        // player.NameTag = `[${lastStatus.name}] ${player.Name}`;
    }
}

function updateOnlineList() {
    // Здесь логика обновления таблицы игроков в UI
    // Используй CONFIG.uiLabels для замены букв K, D, S, RID на нужные слова
    console.log(`Обновление списка. Игроков: \${players.size}`);
}

// 7. Таймер для UI (радужная надпись, время)
setInterval(function() {
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    const timeString = h.toString().padStart(2, '0') + ":" + m.toString().padStart(2, '0') + ":" + s.toString().padStart(2, '0');

    // Логика смены текста каждые 20 сек
    let titleText = "Режим от Тяночки!";
    if (uptime % 20 === 0) {
        titleText = "/help - тут все команды!";
    }

    // Логика цвета
    colorIndex = (colorIndex + 1) % CONFIG.rainbowColors.length;
    const color = CONFIG.rainbowColors[colorIndex];

    // !!! ВАЖНО: Ниже строки для обновления UI. 
    // Замени их на реальные методы твоего UI конструктора.
    // document.getElementById('serverTime').innerText = timeString;
    // document.getElementById('titleText').innerText = titleText;
    // document.getElementById('titleText').style.color = color;
}, 1000);
