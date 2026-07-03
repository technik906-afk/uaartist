/**
 * ========================================
 * TELEGRAM BOT CONFIGURATION
 * ========================================
 * 
 * ИНСТРУКЦИЯ ПО НАСТРОЙКЕ:
 * 
 * 1. Создайте Telegram бота:
 *    - Откройте @BotFather в Telegram
 *    - Отправьте команду /newbot
 *    - Введите имя бота (например: uaartist Shop)
 *    - Введите username бота (должен заканчиваться на _bot, например: uaartist_shop_bot)
 *    - Скопируйте полученный токен
 * 
 * 2. Узнайте свой Chat ID:
 *    - Откройте @userinfobot в Telegram
 *    - Нажмите Start
 *    - Бот покажет ваш Chat ID (например: 123456789)
 * 
 * 3. Добавьте бота в контакты (опционально):
 *    - Найдите своего бота по username
 *    - Нажмите Start
 * 
 * 4. Вставьте значения ниже:
 */

const TELEGRAM_CONFIG = {
    // Токен бота от @BotFather (вынести в .env на бэкенде, НЕ хранить в клиенте)
    botToken: 'YOUR_TELEGRAM_BOT_TOKEN',

    // Ваш Chat ID от @userinfobot
    chatId: 'YOUR_TELEGRAM_CHAT_ID',

    // URL API Telegram
    apiUrl: 'https://api.telegram.org/bot'
};
