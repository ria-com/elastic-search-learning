"use strict";

var entities = require("../data/entities"),
    request = require("request"),
    elasticSearch = {
        "host": "localhost",
        "port": 9200
    };


/* Удаляем предыдущие данные */
new Promise((resolve, reject) => {
    request({
        "url": `http://${elasticSearch.host}:${elasticSearch.port}/songster`,
        "method": "DELETE"
    }, (err, response, body) => {
        console.log("body --> ", body, err);
        err ? reject(err) : resolve(body);
    });
})
    .then((body) => {
        console.log(23);
        return new Promise((resolve, reject) => {
            /* Создаем индекс */
            request({
                "url": `http://${elasticSearch.host}:${elasticSearch.port}/songster`,
                "method": "POST",
                "body": {
                    "mappings": {
                        "tracks": {
                            "properties": {
                                "title": {"type": "string"},
                                "author": {"type": "string"},
                                "album": {"type": "string"},
                                "genre": {"type": "string"}
                            }
                        }
                    }
                },
                "json": true
            }, (err, response, body) => {
                console.log("body --> ", body);
                err ? reject(err) : resolve(body);
            });
        });
    })
    .then((body) => {
        return Promise.all(entities.map((item) => {
            return new Promise((resolve, reject) => {
                request({
                    "url": `http://${elasticSearch.host}:${elasticSearch.port}/songster/tracks/${item.title}`,
                    "method": "POST",
                    "json": true,
                    "body": item
                }, (err, response, body) => {
                    console.log("body --> ", body);
                    err ? reject(err) : resolve(body);
                })
            });
        }));
    })
    .then(() => {
        console.log('Экспорт завершен!')
        process.exit(0);
    }, (err) => {
        console.log('Произошла ошибка --> ', err);
        process.exit(1);
    });


