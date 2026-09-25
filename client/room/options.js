// options.js
// Глобальные настройки и константы

export const CONFIG = {
    // Цвета для радужной надписи
    rainbowColors: ["#FF0000", "#FFA500", "#FFFF00", "#008000", "#0000FF", "#4B0082", "#EE82EE"],
    
    // ID предметов (как ты просил)
    // 0-основное, 1-вторичное, 2-ближнее, 3-гранаты, 4-блоки
    // 5-беск основа, 6-беск вторичное, 7-беск гранаты, 8-беск блоки
    itemIds: {
        primary: 0,
        secondary: 1,
        melee: 2,
        grenade: 3,
        block: 4,
        inf_primary: 5,
        inf_secondary: 6,
        inf_grenade: 7,
        inf_block: 8
    },

    // Текст для UI (замена букв)
    uiLabels: {
        K: "Статусы!",
        D: "R (Рум Айди)",
        S: "Монеты!",
        RID: "Убийства"
    }
};
