const {VK} = require('vk-io');
const config = require("../config");
const webhook = require("webhook-discord");

const vk = new VK();
const {updates} = vk;

const token = process.env.TOKEN || config.vk.token;
const groupId = process.env.GROUP_ID || config.vk.group_id;
const interval = (process.env.INTERVAL || config.interval) * 1000;
const longpoll = process.env.LONGPOLL || config.vk.longpoll;

const send = require("./send");

const {errorHandler} = require("./functions");

if (interval < 30000) console.log("[!] Не рекомендуем ставить интервал получения постов меньше 30 секунд, во избежания лимитов ВКонтакте!");

vk.setOptions({
    token: token,
    apiMode: 'parallel'
});


if (!longpoll) {
    setInterval(() => {
        const webhookBuilder = new webhook.MessageBuilder();

        const idMatch = groupId.match(/^(?:public|group)([\d]+)$/);
        const id = idMatch ? {owner_id: idMatch[1]} : {domain: groupId};

        vk.api.wall.get({
            ...id,
            count: 2,
            extended: 1,
            filter: config.vk.filter ? "owner" : "all",
            v: "5.103"
        })
            .then(data => {
                webhookBuilder.setFooter(data.groups[0].name, data.groups[0].photo_50);

                const posts = data.items;
                const post1 = posts[0];
                const post2 = posts[1];

                if (posts.length > 0) {
                    const postData = posts.length === 2 && post2.date > post1.date ? post2 : post1;

                    send(webhookBuilder, postData, false);
                } else {
                    console.log("[!] Не получено ни одной записи. Проверьте наличие записей в группе или измените значение фильтра в конфигурации.")
                }

            })
            .catch(err => errorHandler(err));
    }, interval);
} else {
    updates.on('new_wall_post', context => {
        const webhookBuilder = new webhook.MessageBuilder();

        send(webhookBuilder, context.wall, true);
    });

    updates.start()
        .then(() => console.log("[Бот] Подключен к ВКонтакте!"))
        .catch(err => errorHandler(err));
}

console.log("[Бот] Запущен");