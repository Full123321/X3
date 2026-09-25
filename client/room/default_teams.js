// default_teams.js
// Настройка команд при старте режима

export function setupTeams() {
    try {
        // 1. Удаляем все старые команды (Синие, Красные и т.д.)
        const allTeams = Teams.GetAll();
        for (let i = 0; i < allTeams.length; i++) {
            Teams.Remove(allTeams[i].Tag);
        }

        // 2. Создаем команду "Чёрные"
        // Tag: 'Black', Display Name: 'Чёрные', Color: Black (0,0,0)
        Teams.Add('Black', 'Чёрные', { r: 0, g: 0, b: 0 });
        const blackTeam = Teams.Get('Black');

        // 3. Копируем спавны с "Синих" на "Чёрных"
        const blueTeam = Teams.Get('Blue');
        
        if (blueTeam) {
            const blueSpawns = Spawns.GetContext(blueTeam);
            const blackSpawns = Spawns.GetContext(blackTeam);

            // Копируем группы спавнов
            for (let i = 0; i < blueSpawns.SpawnPointsGroups.Count; i++) {
                const group = blueSpawns.SpawnPointsGroups.Get(i);
                blackSpawns.SpawnPointsGroups.Add(group);
            }

            // Копируем кастомные точки спавна
            for (let i = 0; i < blueSpawns.CustomSpawnPoints.Count; i++) {
                const point = blueSpawns.CustomSpawnPoints.Get(i);
                blackSpawns.CustomSpawnPoints.Add(point.X, point.Y, point.Z, point.Rotation);
            }
            console.log("[Teams] Спавны успешно скопированы с Синих на Чёрных.");
        } else {
            console.warn("[Teams] Команда 'Blue' не найдена на карте. Используются дефолтные спавны.");
        }

        // 4. Защита: принудительно кидаем всех в команду Чёрных
        Teams.OnPlayerChangeTeam.Add(function(player) {
            if (player.Team.Tag !== 'Black') {
                player.Team = blackTeam;
            }
        });

    } catch (e) {
        console.error("[Teams] Ошибка настройки команд: " + e.message);
    }
}
