// ==UserScript==
// @name         LMS Sync with Trello
// @namespace    http://rarakun.com
// @version      0.1
// @description  Sync LMS with Trello and add status to tasks
// @author       Ezequiel Calderara
// @match        https://*.santillanacompartir.com/student-new/schoolclasses/*
// @downloadURL  https://raw.githubusercontent.com/ironicnet/lms-sync/master/userscript.js
// @updateURL    https://raw.githubusercontent.com/ironicnet/lms-sync/master/userscript.js
// @grant        none
// ==/UserScript==

class TrelloAPI {
    trelloApiEndpoint = 'https://api.trello.com/1/';
    constructor(auth) {
        this.auth = auth;
        this.authParams = `key=${auth.key}&token=${auth.token}`;
    }
    getBoard(id) {
        const request = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        };
        return fetch(
            `https://api.trello.com/1/boards/${id}?${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('getBoard response', {
                        request,
                        response: text,
                    }) || text,
            );
    }

    updateCard(cardInfo) {
        const request = {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cardInfo),
        };
        return fetch(
            `https://api.trello.com/1/cards/${cardInfo.id}?${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('updateCard response', {
                        request,
                        response: text,
                    }) || text,
            )
            .catch((err) => console.error(err));
    }
    getBoardLists(id) {
        const request = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        };
        return fetch(
            `https://api.trello.com/1/boards/${id}/lists?${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('getBoard response', {
                        request,
                        response: text,
                    }) || text,
            )
            .catch((err) => console.error(err));
    }
    getCards(boardId, fields = 'id,name,desc,idList') {
        var params = `${fields ? `fields=${fields}` : ''}`;
        var request = {
            method: 'GET',
        };
        return fetch(
            `https://api.trello.com/1/boards/${boardId}/cards?${params}&${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('getCards response', {
                        request,
                        response: text,
                    }) || text,
            )
            .catch((err) => console.error(err));
    }
    getCard(cardId, boardId, fields = 'id,name,desc,idList') {
        var params = `${fields ? `fields=${fields}` : ''}`;
        var request = {
            method: 'GET',
        };
        return fetch(
            `https://api.trello.com/1/boards/${boardId}/cards/${cardId}?${params}&${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('getCard response', {
                        request,
                        response: text,
                    }) || text,
            )
            .catch((err) => console.error(err));
    }
    /**
 *
 * @param {object} cardInfo
 * @param {string} cardInfo.name The name for the card
 * @param {string} cardInfo.desc The description for the card
 * @param {string} cardInfo.pos The position of the new card. top, bottom, or a positive float

 */
    createCard(cardInfo) {
        const request = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cardInfo),
        };
        return fetch(
            `https://api.trello.com/1/cards?${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('createCard response', {
                        request,
                        response: text,
                    }) || text,
            )
            .catch((err) => console.error(err));
    }
    getLists(boardId) {
        var request = {
            method: 'GET',
        };
        return fetch(
            `https://api.trello.com/1/boards/${boardId}/lists?${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('getLists response', {
                        request,
                        response: text,
                    }) || text,
            )
            .catch((err) => console.error(err));
    }
    getBoards() {
        var request = {
            method: 'GET',
        };
        return fetch(
            `https://api.trello.com/1/members/me/boards?fields=name,url&${this.authParams}`,
            request,
        )
            .then((response) => response.json())
            .then(
                (text) =>
                    console.log('getBoards response', {
                        request,
                        response: text,
                    }) || text,
            )
            .catch((err) => console.error(err));
    }
}

(function () {
    'use strict';
    var urlIdPattern = /\/activities\/([0-9]+)\?/;
    var classIdPattern = /\/([0-9]+)\/activities/;
    var storedIdPattern = /activity-([0-9]+)/;
    var storedId = (id) => `activity-${id}`;
    var trelloAPI = null;
    const STATUS = {
        NEW: 'new',
        PENDING: 'pending',
        IN_PROGRESS: 'in-progress',
        DONE: 'done',
        DELIVERED: 'delivered',
    };
    var config = {
        boardId: '5eb9c5fd5625af5a52944331',
        COLORS: {
            [STATUS.NEW]: '#ffffc7',
            [STATUS.PENDING]: '#ffe8c3',
            [STATUS.IN_PROGRESS]: '#beffff',
            [STATUS.DONE]: '#d9ffd8',
            [STATUS.DELIVERED]: '#e2e2e2',
        },
        REFRESH_INTERVAL: 2500,
    };
    const lists = {
        todoList: null,
        inProgressList: null,
        doneList: null,
        deliveredList: null,
    };
    var cardsCache = [];
    var verifyConfig = () => {
        var storedConfig = {};
        var configText = localStorage.getItem('config');
        if (configText) storedConfig = JSON.parse(configText);

        var isConfigValid = false;
        var authValid = storedConfig.key && storedConfig.token;
        if (!authValid) {
            if (!storedConfig.key)
                storedConfig.key = prompt('Please enter your api key');
            if (!storedConfig.token)
                storedConfig.token = prompt('Please enter your api token');
            localStorage.setItem('config', JSON.stringify(storedConfig));
            authValid = storedConfig.key && storedConfig.token;
        }
        if (authValid) {
            trelloAPI = new TrelloAPI(storedConfig);
        }
        if (authValid && !storedConfig.boardId) {
            trelloAPI.getBoards().then((boards) => {
                var text = boards
                    .map((board, index) => `${index+1}) ${board.name}: ${board.id}`)
                    .join('\r\n');
                var indexString = prompt(
                    'Please enter the board you want. Boards availables: ' + text,
                    'Enter the index number: 1, 2, 3, etc...'
                );
                var index = parseInt(indexString)-1;
                if (boards[index]) {
                    storedConfig.boardId = boards[index].id;
                    localStorage.setItem('config', JSON.stringify(storedConfig));
                    location.reload();
                } else {
                    console.error('invalid boardid', indexString, index, boards);
                    alert('Invalid board selection');
                }
            });
        }
        isConfigValid = authValid && storedConfig.boardId;
        if (isConfigValid) {
            config.boardId = storedConfig.boardId;

            if (
                !lists.todoList ||
                !lists.inProgressList ||
                !lists.doneList ||
                !lists.deliveredList
            ) {
                return trelloAPI
                    .getBoard(config.boardId)
                    .then(() =>
                        trelloAPI
                            .getBoardLists(config.boardId)
                            .then((response) => {
                                lists.todoList = response[0];
                                lists.inProgressList = response[1];
                                lists.doneList = response[2];
                                lists.deliveredList = response[3];
                            })
                            .then(() => {
                                return trelloAPI
                                    .getCards(config.boardId)
                                    .then((cards) => (cardsCache = cards));
                            }),
                    )
                    .catch((err) =>
                        console.error(
                            `Error retrieving board: ${err}`,
                            err,
                            config,
                        ),
                    );
            }
        } else {
            return Promise.reject('Config is not valid');
        }
    };
    var activitiesListView = () => {
        const activities = [];
        const links = document.querySelectorAll(
            '.activities-card-kids a:not([data-linked="true"])',
        );
        links.forEach((link) => {
            var url = link.href;
            var id = urlIdPattern.exec(link.href)[1];
            var title = link.querySelector('.title').innerText;
            var description = '';
            activities.push({
                id,
                url,
                title,
                description,
                cardId: null,
                container: link,
                type: 'list',
            });
        });

        return activities;
    };
    var getElText = (selector) => {
        var el = document.querySelector(selector);
        return el ? el.innerText.trim() : null;
    };
    var activityInDetailView = () => {
        var matches = urlIdPattern.exec(location.href);
        var id = matches && matches[1];
        if (id) {
            var container = document.querySelector(
                '.container-kids__content:not([data-linked="true"])',
            );
            var description = getElText('.activity-kids-description');
            var title = getElText('.crumb-last-apart');

            return {
                id,
                url: location.href,
                title,
                description,
                cardId: null,
                container,
                type: 'detail',
            };
        } else {
            return null;
        }
    };
    var isInClassView = () => classIdPattern.exec(location.href);
    var updateLocalActivities = (activities) =>
        activities.forEach((activity) => {
            updateStoredItem(activity.id, (stored) =>
                stored
                    ? {
                          title: activity.title || stored.title,
                          description:
                              activity.description || stored.description,
                          cardId: activity.cardId || stored.cardId,
                      }
                    : activity,
            );
        });

    var tryParseActivities = () => {
        const activities = [
            ...activitiesListView(),
            activityInDetailView(),
        ].filter((v) => !!v);
        updateLocalActivities(activities);

        return activities;
    };

    var updateStoredItem = (id, changesCallback) => {
        var activityID = storedId(id);
        var storedActivity = localStorage.getItem(activityID);
        storedActivity = storedActivity ? JSON.parse(storedActivity) : null;
        localStorage.setItem(
            activityID,
            JSON.stringify({
                ...storedActivity,
                ...changesCallback(storedActivity),
            }),
        );
    };
    var getLocalActivities = () => {
        return Object.keys(localStorage)
            .filter((item) => storedIdPattern.exec(item))
            .map(getLocalActivity);
    };
    var getLocalActivity = (id) => {
        var activity = JSON.parse(localStorage.getItem(id));
        if (activity && activity.cardId) {
            var card = cardsCache.find(
                (cachedCard) => activity.cardId === cachedCard.id,
            );
            if (!card) {
                console.error(
                    `Card not found: ${activity.cardId}`,
                    activity,
                    cardsCache,
                );
                trelloAPI
                    .getCard(activity.cardId)
                    .then((foundCard) => {
                        cardsCache.push(foundCard);
                    })
                    .catch((err) => {
                        console.error(
                            `Card not found: ${activity.cardId}. Removing link. ${err}`,
                            activity,
                            cardsCache,
                        );
                        updateStoredItem(activity.id, () => ({
                            cardId: null,
                        }));
                    });
            }
            activity.card = card;
        }

        return activity;
    };
    var mapNewActivitiesToCards = () => {
        var localActivities = getLocalActivities();

        localActivities
            .filter((activity) => !activity.cardId)
            .forEach((activity) => {
                var card = cardsCache.find(
                    (card) => card.name === activity.title,
                );
                if (card) {
                    activity.cardId = card.id;

                    updateStoredItem(activity.id, () => ({
                        cardId: card.id,
                    }));
                }
            });
    };
    var generateActivityDescription = (activity) => {
        return `${activity.url}

${activity.description}`;
    };
    var updateActivitiesDescriptions = () => {
        var localActivities = getLocalActivities();

        return localActivities.map((activity) => {
            if (activity.description) {
                if (activity.cardId) {
                    return updateCardDescription(activity);
                } else {
                    return trelloAPI
                        .createCard({
                            name: activity.title,
                            pos: 'bottom',
                            desc: generateActivityDescription(activity),
                            idList: lists.todoList.id,
                        })
                        .then((card) => {
                            activity.cardId = card.id;
                            updateStoredItem(activity.id, () => ({
                                cardId: card.id,
                            }));
                            cardsCache.push(card);
                            return { card, activity };
                        });
                }
            }
        });
    };

    function updateCardDescription(activity) {
        const description = generateActivityDescription(activity);
        return trelloAPI
            .getCard(activity.cardId, config.boardId, '')
            .then((card) => {
                var titleChanged = card.name !== activity.title;
                var descriptionChanged = card.desc !== description;
                if (titleChanged || descriptionChanged) {
                    trelloAPI
                        .updateCard({
                            ...card,
                            name: activity.title,
                            desc: description,
                        })
                        .then((updatedCard) => {
                            return { card: updatedCard, activity };
                        });
                } else {
                    return { card, activity };
                }
            });
    }
    var getStatus = (activity) => {
        switch (activity && activity.card && activity.card.idList) {
            case lists.todoList.id:
                return STATUS.PENDING;
            case lists.inProgressList.id:
                return STATUS.IN_PROGRESS;
            case lists.doneList.id:
                return STATUS.DONE;
            case lists.deliveredList.id:
                return STATUS.DELIVERED;
            default:
                return STATUS.NEW;
        }
    };
    var updateActivitiesRender = (renderers) => {
        renderers.forEach((renderer) => {
            var activity = getLocalActivity(storedId(renderer.id));
            var status = getStatus(activity);
            if (renderer.type === 'detail') {
                renderer.container.style.backgroundColor =
                    config.COLORS[status];
            } else {
                renderer.container.style.borderRadius = '12pt';
                renderer.container.style.backgroundColor =
                    config.COLORS[status];
                var statusLabel = renderer.container.querySelector(
                    `[data-status-label="true"]`,
                );
                if (!statusLabel) {
                    var statusDiv = document.createElement('div');
                    statusDiv.className = 'lateral';
                    statusLabel = document.createElement('p');
                    statusLabel.className = 'lateral-month';
                    statusLabel.setAttribute('data-status-label', 'true');
                    statusDiv.appendChild(statusLabel);
                    renderer.container.appendChild(statusDiv);
                }
                statusLabel.innerText = getStatus(activity);
            }

            renderer.container.setAttribute('data-linked', true);
        });
    };

    verifyConfig().then(() => {
        var currentActivities = tryParseActivities();
        mapNewActivitiesToCards();
        updateActivitiesDescriptions();

        window.activitiesInterval = setInterval(() => {
            currentActivities = tryParseActivities();

            mapNewActivitiesToCards();

            if (currentActivities)
                updateActivitiesRender(
                    currentActivities.filter((activity) => activity.container),
                );
        }, config.REFRESH_INTERVAL);

        window.stopRefresh = () => clearInterval(window.activitiesInterval);
    });
})();
