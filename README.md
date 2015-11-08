# Небольшой курс лекций по Elastic Search

[План лекций](https://docs.google.com/a/ria.com/document/d/1elQ5KLu-8UyaRsdJfhIN_BuxjQrMHgW5kVVU7xDw4TQ/edit?usp=sharing)

## Установка и настройка

Для ОС Fedora есть свой репозиторий. Для того, чтобы установить себе Elastic Search версии 1.4, необходимо добавить в файл `/etc/yum.repos.d/` следующие настройки:

```ini
[elasticsearch-1.4]
name=Elasticsearch repository for 1.4.x packages
baseurl=http://packages.elasticsearch.org/elasticsearch/1.4/centos
gpgcheck=1
gpgkey=http://packages.elasticsearch.org/GPG-KEY-elasticsearch
enabled=1
```

После этого установить его можно командой: 

```bash
yum install elasticsearch
```

### С чего начать?

Elastic Search - база данных с открытым исходным кодом предназначенная для полнотекстового поиска. Она позволяет хранить, анализировать и получать большие объемы данных в режиме реального времени.

Для анализа и поиска Elastic Search использует библиотеку [Apache Lucene](http://lucene.apache.org/core/). Его можно применять при реализации следующих задач:

- Полнотекстовый поиск
- Поиск по параметрам
- Агрегация данных для статистики и их последующая визуализация
- Генерация вариантов для автокомплита

Для работы с данными у Elastic Search есть специальное REST API. 

#### Основные параметры REST API

Если в запросе передать `?pretty=true`, то JSON в ответе будет отформатирован таким образом, что его можно будет прочитать.

Добавив параметр `?format=yaml`, ответ получим в yaml.

#### Терминология

В Elastic Search используются такие понятия, как индекс (index), тип (type) и документ (document). Если проводить аналогию с MySQL, то это база данных (database), таблица (table) и рядок (row)

#### Создание нового индекса

Самый простой вариант создания индекса приведен ниже:

```bash
curl -XPUT 'http://localhost:9200/twitter/'
```

Если все прошло нормально, то в ответе мы получим сообщение:

```json
{"acknowledged":true}
```

Также при создании индекса можно описать все типы документов, которые будут в нем хранится:

```bash
curl -XPOST localhost:9200/test -d '{
    "mappings" : {
        "type1" : {
            "properties" : {
                "field1" : { "type" : "string"}
            }
        }
    }
}'
```

#### Создание нового документа

### Инструменты для работы с Elastic Search

### Прогнозирование нагрузки

## Индексация и поиск

### Что важно знать?

#### Что такое релевантность?

Как только у нас появился список подходящих документов, необходимо как-то их отсортировать. Не все документы будут содержать все слова (термины) и не все слова одинаково важны.
Вес (значение) слова зависит от [трех факторов](https://www.elastic.co/guide/en/elasticsearch/guide/current/relevance-intro.html):

   1. Term Frequency (TF) - Как часто встречается слово (термин) в поле документа? Чем чаще - тем больший вес оно (слово) имеет. Поле содержащее пять упоминаний слова (термина) будет более релевантно, чем поле, которое содержит только одно такое слово
   2. Inverse Document Frequency (IDF) - Как часто встречается слово (термин) в индексе (коллекции документов)? Чем чаще, тем меньший вес оно имеет. Слово, которое встречается во многих документах имеет меньший вес, чем то, которое встречается редко
   3. Field-Length Norm - На сколько длинное поле (в документе)? Чем оно длинее, тем менее релевантными будут слова, которые в нем встречаются. Слово, которое встречается в коротком поле `title` несет в себе больший вес, чем то же слово встречающееся в длинном поле `content`

При помощи этих трех параметров `Elastic Search` вычисляет параметр `score`, по которому и сортирует документы.

#### Понимание параметра ’score’

При отладке сложного запроса порой бывает тяжело понять, как же этот параметр был посчитан. К счастью, у `Elastic Search` есть специальная опция, которая будет добавлять разъяснение к каждому поисковому запросу. Для этого необходимо всего лишь добавить параметр `explain` равный `true`.

```bash
GET /_search?explain
{
   "query"   : { "match" : { "tweet" : "honeymoon" }}
}
```

Сначала в ответе будут идти метаданные, которые возвращаются при обычном поисковом запросе:

```json
{
    "_index" :      "us",
    "_type" :       "tweet",
    "_id" :         "12",
    "_score" :      0.076713204,
    "_source" :     { ... trimmed ... },
```

Также `Elastic Search` добавит информацию о том, с какого ’shard’ и какой `node` пришел документ.

```json
    "_shard" :      1,
    "_node" :       "mzIVYCsqSWCG_M_ZffSs9Q",
```

После этого последует объяснение (`_explanation`). Каждый элемент содержит в себе описание (`description`), которое говорит нам о том, какие вычисления были произведены, и их результат (`value`). Поле `details` содержит в себе список любых дополнительных вычислений, которые понадобились.

```javascript
"_explanation": { /* 1 */
   "description": "weight(tweet:honeymoon in 0)
                  [PerFieldSimilarity], result of:",
   "value":       0.076713204,
   "details": [
      {
         "description": "fieldWeight in 0, product of:",
         "value":       0.076713204,
         "details": [
            { /* 2 */
               "description": "tf(freq=1.0), with freq of:",
               "value":       1,
               "details": [
                  {
                     "description": "termFreq=1.0",
                     "value":       1
                  }
               ]
            },
            { /* 3 */
               "description": "idf(docFreq=1, maxDocs=1)",
               "value":       0.30685282
            },
            { /* 4 */
               "description": "fieldNorm(doc=0)",
               "value":        0.25,
            }
         ]
      }
   ]
}
```

Разъяснение:

   1. Содержание подсчета `score` для слова `honeymoon`
   2. Term Frequency (TF)
   3. Inverse Document Frequency (IDF)
   4. Field-Length Form

Первая часть содержания содержит в себе результаты вычислений. Она говорит нам, что был посчитан вес (`weight`) - TF/IDF - слова `honeymoon` в поле `tweet` для документа `0` (Это внутренний идентификатор документа, который используется сугубо в служебных целях - его можно игнорировать).

Далее следуют детали того, как вес (`weight`) был посчитан:

   * Term Frequency - Сколько раз встретилось слово `honeymoon` в поле ’tweet’ этого документа?
   * Inverse Document Frequency - Сколько раз встретилось слово `honeymoon` в поле `tweet` всех документов в коллекции (индексе)?
   * Field-Length Form - Какова длина поля `tweet` в этом документе? Чем длиннее поле, тем меньше это число

#### Почему документ нам подходит?

Если добавлять параметр `explain` для каждого конкретного результата, можно понять почему документ подходит, и что важнее - почему нет?

Ссылка выглядит следующим образом `/index/type/id/_explain`:

```bash
GET /us/tweet/12/_explain
{
   "query" : {
      "filtered" : {
         "filter" : { "term" :  { "user_id" : 2           }},
         "query" :  { "match" : { "tweet" :   "honeymoon" }}
      }
   }
}
```

Вместе с полным объяснением, которое мы видели ранее, нам также доступно поле `description`, которое говорит нам, что:

```javascript
"failure to match filter: cache(user_id:[2 TO 2])"
```

Другими словами, наш `user_id` в секции фильтра запроса не дает возможности документу подойти под запрос.

### Фильтры и токенайзеры

#### Анализ и Анализаторы

`Анализ` - это [процесс](https://www.elastic.co/guide/en/elasticsearch/guide/current/analysis-intro.html), состоящий из следующих этапов:

   1. Фильтрация символов (`Character filters`) - всегда происходит в первую очередь. Основая задача этого этапа анализа - убрать все ненужные символы, прежде чем строка попадет на обработку токенайзеру
   2. Разбитие на токены (`Tokenizer`) - по специальному символу или набору символов текст разбивается на слова, фразы или наборы символов.
   3. Фильтрация токенов (`Token filters`) - на этом этапе может происходить видоизменение токена (приведение к нижнему регистру, например), удаление (например, список `stopwords`) или добавление нового (синонимы, например `автомобиль`, `машина` и т.п.)

`Анализатор` - это набор входных фильтров, токенайзеров и выходных фильтров.

#### Встроенные анализаторы `Elastic Search`

На [примере](https://www.elastic.co/guide/en/elasticsearch/guide/current/analysis-intro.html#_built_in_analyzers) строки `Set the shape to semi-transparent by calling set_trans(5)` рассмотрим стандартные анализаторы `Elastic Search`:

   1. *Стандартный анализатор* (`Standard analyzer`) - он используется в `Elastic Search` по-умолчанию. Среди его основных особенностей: разбивает текст по словам, удаляет большую часть пунктуации и приводит все токены к нижнему регистру. В результате чего он вернет следующий набор токенов: `set, the, shape, to, semi, transparent, by, calling, set_trans, 5`
   2. *Простой анализатор* (`Simple analyzer`) - разбивает текст на слова по любому не буквенному символу и приводит к нижнему регистру токены. Результатом его работы будет: `set, the, shape, to, semi, transparent, by, calling, set, trans`
   3. *Whitespace analyzer* - разбивает текст по пробелу на слова. Он ничего не приводит к нижнему регистру и на выходе мы получим следующий набор токенов: `Set, the, shape, to, semi-transparent, by, calling, set_trans(5)`
   4. *Языковый анализатор* (`Language analyzers`) - разбивает текст на слова, фильтрует "мусор" и обрезает окончания учитывая морфолигию языка. Доступен для [многих языков](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-lang-analyzer.html). Результатами его работы будет следующий набор токенов: `set, shape, semi, transpar, call, set_tran, 5`

#### Когда необходимо использовать анализаторы?

Обычно, когда речь заходит о полнотекстовом поиске, причем очень важным является использование одинакового анализатора при индексации документа и при его поиске, чтобы у нас токены формировались по одинаковым правилам.

#### Тестирование анализаторов

Все это очень хорошо, но как можно проверить срабатывание анализатора на кокретном тексте? Для того, чтобы нам помочь в этом нелегком деле, в `Elastic Search` есть специальное API:

```bash
GET /_analyze?analyzer=standard
Text to analyze
```

или

```bash
GET /_analyze?analyzer=standard&text=Text to analyze
```

Результатом выполнения данного запроса будет следующее:

```javascript
{
   "tokens": [
      {
         "token":        "text",
         "start_offset": 0,
         "end_offset":   4,
         "type":         "<ALPHANUM>",
         "position":     1
      },
      {
         "token":        "to",
         "start_offset": 5,
         "end_offset":   7,
         "type":         "<ALPHANUM>",
         "position":     2
      },
      {
         "token":        "analyze",
         "start_offset": 8,
         "end_offset":   15,
         "type":         "<ALPHANUM>",
         "position":     3
      }
   ]
}
```

Где `token` собственно и является тем значением, которое будет проиндексировано. Поле `position` - порядок, в котором токены встречаются в оригинальном тексте.

#### Создание собственных анализаторов

Создать их можно при помощи запроса следующего типа:

```javascript
PUT /my_index
{
    "settings": {
        "analysis": {
            "char_filter": { ... custom character filters ... },
            "tokenizer":   { ...    custom tokenizers     ... },
            "filter":      { ...   custom token filters   ... },
            "analyzer":    { ...    custom analyzers      ... }
        }
    }
}
```

Анализаторы можно создавать на основе стандартных фильтров и токенайзеров или описывать свои собственные. Их список можно посмотреть по [ссылке](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis.html).

Рассмотрим как создать анализатор для марок и моделей автомобилей. Основные требования к нему - учитывать безграмотность пользователя и разные слэнговые варианты названий.

Для этого нам понадобится [Whitespace Tokenizer](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-whitespace-tokenizer.html), [Phonetic Token Filter](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-phonetic-tokenfilter.html) и [Synonym Token Filter](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-synonym-tokenfilter.html).

```bash
PUT /my_index
{
    "settings": {
        "analysis": {
            "filter": {
                "synonym": {
                    "type":       "synonym",
                    "synonyms": [
                         "беха, бумер => bmw",
                         "mercedes => mercedes-benz"
                    ]
                },
                "metaphone" : {
                    "type" : "phonetic",
                    "encoder" : "metaphone",
                    "replace" : false
                }
            },
            "analyzer": {
                "mark_and_model": {
                    "type":         "custom",
                    "tokenizer":    "whitespace",
                    "filter":       ["synonym", "metaphone" ]
            }}
}}}
```

Теперь можно проверить как наш анализатор будет справляться со своими обязанностями.

Анализ слова `бумер`:

```bash
GET /my_index/_analyze?analyzer=mark_and_model&text=%D0%B1%D1%83%D0%BC%D0%B5%D1%80
```

```javascript
{
   "tokens": [
      {
         "token": "BM",
         "start_offset": 0,
         "end_offset": 5,
         "type": "SYNONYM",
         "position": 1
      },
      {
         "token": "bmw",
         "start_offset": 0,
         "end_offset": 5,
         "type": "SYNONYM",
         "position": 1
      }
   ]
}
```

Как видим, анализатор сгенерировал два токена - `BM` и `bmw`.

Анализ слов `e-class e-klasse`:
```bash
GET /my_index/_analyze?analyzer=mark_and_model&text=e-class e-klasse
```

```javascript
{
   "tokens": [
      {
         "token": "EKLS",
         "start_offset": 0,
         "end_offset": 7,
         "type": "word",
         "position": 1
      },
      {
         "token": "e-class",
         "start_offset": 0,
         "end_offset": 7,
         "type": "word",
         "position": 1
      },
      {
         "token": "EKLS",
         "start_offset": 8,
         "end_offset": 16,
         "type": "word",
         "position": 2
      },
      {
         "token": "e-klasse",
         "start_offset": 8,
         "end_offset": 16,
         "type": "word",
         "position": 2
      }
   ]
}
```

Мы получили по два токена по каждому слову. В данном конкретном случае на интересует то, что не смотря на разность в написании двух слов, токен `EKLS` для них одинаков - это означает, что если мы проиндексируем данное слово используя фонетический анализатор, то мы потом сможем его найти используя различные варианты написания, но которые звучат похоже.

Как бонус, ко всему этому можно докрутить [Unique Token Filter](https://www.elastic.co/guide/en/elasticsearch/reference/2.0/analysis-unique-tokenfilter.html) и [Shingle Token Filter](https://www.elastic.co/guide/en/elasticsearch/reference/2.0/analysis-shingle-tokenfilter.html) чтобы получить уникальные токены и токены-словосочетания для правильной индексации фраз `бумер x5`, например.