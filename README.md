# ⚽ React + TanStack Table: Sorting

Навчальний приклад роботи з таблицями в **React** та бібліотекою **TanStack Table**.

Проєкт показує, як реалізувати сортування даних у React двома способами:

1. повністю вручну через React state та `Array.sort()`;
2. за допомогою `@tanstack/react-table`.

Основний фокус проєкту саме на **React, table state та TanStack Table**. ASP.NET Core Web API використовується як backend для отримання та зміни даних.

## ✨ Що тут можна побачити

- React 19 + Vite;
- `@tanstack/react-table`;
- опис колонок через `createColumnHelper`;
- керування sorting state;
- ascending / descending sorting;
- `getToggleSortingHandler()`;
- визначення поточного напрямку через `getIsSorted()`;
- `createSortedRowModel()`;
- `tableFeatures()` та `rowSortingFeature`;
- отримання відсортованих рядків через `getRowModel()`;
- порівняння бібліотечного та ручного підходів;
- CRUD-інтерфейс для гравців і команд;
- робота React із REST API;
- loading та error states;
- редагування і видалення записів;
- адаптивна таблиця та власний UI.

## 🖥️ Інтерфейс

Застосунок містить два розділи:

**Гравці**

Таблиця відображає:

- ID;
- ім'я;
- вік;
- позицію;
- команду.

Для цих колонок доступне сортування.

**Команди**

Таблиця відображає:

- ID;
- назву команди;
- тренера.

Для обох розділів доступні створення, редагування та видалення записів.

## 🔃 Сортування в React

Головна частина прикладу знаходиться у:

```text
react.client/src/App.jsx
```

У проєкті навмисно залишено два підходи до сортування, щоб їх можна було порівняти.

### 1. Ручне сортування

Перший варіант реалізований без table-бібліотеки.

Стан сортування можна представити так:

```js
const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
});
```

При натисканні на заголовок:

```text
нова колонка
    ↓
встановити asc

та сама колонка
    ↓
asc → desc
```

Після цього масив сортується вручну:

```js
const sortedPlayers = useMemo(() => {
    if (!sortConfig.key) return players;

    const { key, direction } = sortConfig;
    const factor = direction === 'asc' ? 1 : -1;

    return [...players].sort((a, b) => {
        const valueA = a[key];
        const valueB = b[key];

        if (valueA < valueB) return -1 * factor;
        if (valueA > valueB) return 1 * factor;

        return 0;
    });
}, [players, sortConfig]);
```

Це хороший спосіб зрозуміти, що насправді відбувається під час сортування таблиці.

Але разом із розвитком таблиці доведеться самостійно додавати все більше логіки.

## 2. TanStack Table

Основний варіант у проєкті використовує:

```bash
npm install @tanstack/react-table
```

Для опису колонок використовується `createColumnHelper`:

```js
const columnHelper = createColumnHelper();

const playersColumns = useMemo(
    () => [
        columnHelper.accessor('id', {
            header: 'ID'
        }),
        columnHelper.accessor('name', {
            header: "Ім'я"
        }),
        columnHelper.accessor('age', {
            header: 'Вік'
        }),
        columnHelper.accessor('position', {
            header: 'Позиція'
        }),
        columnHelper.accessor('team', {
            header: 'Команда'
        })
    ],
    []
);
```

Так React-компонент отримує декларативний опис структури таблиці.

## 🧠 Sorting State

TanStack Table використовує окремий state для сортування:

```js
const [sorting, setSorting] = useState([]);
```

Наприклад:

```js
[
    {
        id: 'name',
        desc: false
    }
]
```

означає сортування за колонкою `name` у напрямку `asc`.

Для descending:

```js
[
    {
        id: 'name',
        desc: true
    }
]
```

Такий підхід значно зручніший, коли таблиця поступово стає складнішою.

## ⚙️ Налаштування TanStack Table

У проєкті використовується sorting feature:

```js
const playersTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel()
});
```

Після цього створюється table instance:

```js
const playersTable = useTable({
    features: playersTableFeatures,
    data: players,
    columns: playersColumns,
    state: {
        sorting
    },
    onSortingChange: setSorting
});
```

Тут добре видно одну з ключових ідей TanStack Table:

> бібліотека керує логікою таблиці, але не забирає у React контроль над UI.

HTML і CSS залишаються під контролем компонента.

## 🖱️ Сортування при натисканні

Для заголовка колонки можна отримати готовий handler:

```js
const getSortHandler = (key) =>
    playersTable
        .getColumn(key)
        ?.getToggleSortingHandler();
```

У JSX:

```jsx
<th
    className="sortable"
    onClick={getSortHandler('name')}
>
    Ім'я
    {renderSortIcon('name')}
</th>
```

TanStack Table сама керує перемиканням напрямку сортування.

У результаті:

```text
Ім'я
  ↓
asc
  ↓
desc
```

## ▲ ▼ Індикатор сортування

Поточний напрямок можна отримати через:

```js
const direction =
    playersTable
        .getColumn(key)
        ?.getIsSorted();
```

Функція повертає:

```text
false
asc
desc
```

Тому UI може показувати:

```text
Ім'я
Ім'я ▲
Ім'я ▼
```

Це дозволяє не дублювати в компоненті власну логіку визначення активного сортування.

## 📊 Отримання відсортованих рядків

Після налаштування table instance відсортовані рядки можна отримати через:

```js
const sortedPlayers =
    playersTable
        .getRowModel()
        .rows
        .map(row => row.original);
```

Саме цей масив використовується для рендерингу `<tbody>`.

Тобто потік даних виглядає приблизно так:

```text
players
   │
   ▼
TanStack Table
   │
   ├── columns
   ├── sorting state
   └── sorting feature
   │
   ▼
getRowModel()
   │
   ▼
sorted players
   │
   ▼
React JSX
```

## 🆚 Ручний підхід vs TanStack Table

| | Ручне сортування | TanStack Table |
|---|---|---|
| State | власний | table state |
| `Array.sort()` | пишемо самі | table logic |
| Toggle asc/desc | пишемо самі | готовий handler |
| Sorting indicator | власна логіка | `getIsSorted()` |
| Columns | звичайний JSX | column definitions |
| Розширення таблиці | більше ручної роботи | готова table architecture |
| Контроль UI | повний | повний |
| HTML/CSS | власні | власні |

Головна перевага TanStack Table у цьому прикладі не в тому, що вона робить `sort()` замість нас.

Цінність у тому, що вона дає структурований механізм для **state, columns, rows та table features**, який можна розширювати разом із таблицею.

## 🌐 Робота з API

React отримує дані через REST API:

```js
const response = await fetch('/api/players');
const data = await response.json();

setPlayers(data);
```

Для команд використовується:

```text
/api/teams
```

Для гравців:

```text
/api/players
```

API також використовується для:

```text
GET
POST
PUT
DELETE
```

Backend у цьому проєкті потрібен передусім для забезпечення даними frontend-частини.

## 📁 Структура React-проєкту

```text
react.client/
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
│
├── public/
│
├── package.json
├── vite.config.js
└── eslint.config.js
```

Основна логіка таблиці знаходиться в:

```text
src/App.jsx
```

Стилі:

```text
src/App.css
```

## 🚀 Запуск

Клонуйте репозиторій:

```bash
git clone https://github.com/sunmeat/aspnetcore_tanstack_table_sorting.git
```

Перейдіть у React-проєкт:

```bash
cd aspnetcore_tanstack_table_sorting/react.client
```

Встановіть залежності:

```bash
npm install
```

Запустіть Vite:

```bash
npm run dev
```

Для production build:

```bash
npm run build
```

Перевірка ESLint:

```bash
npm run lint
```

## 📦 Основні залежності

```json
{
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "@tanstack/react-table": "^9.2.4"
}
```

Development environment:

```text
Vite
ESLint
@vitejs/plugin-react
```

## 🎯 Навчальна мета

Цей проєкт можна використовувати як практичний приклад під час вивчення React.

Особливо корисно розібрати:

- як зберігати state таблиці;
- як React реагує на зміну sorting state;
- як описувати columns;
- як передавати дані в TanStack Table;
- як отримувати table instance;
- як підключати table features;
- як працює sorting model;
- як створювати власний UI поверх headless-бібліотеки;
- коли ручна реалізація починає ставати зайвою.

Найцікавіша частина прикладу проста: **одна й та сама задача вирішується спочатку власноруч, а потім через TanStack Table**. Це дозволяє побачити не тільки API бібліотеки, а й проблему, яку вона вирішує.

## 🔗 Посилання

- Repository: https://github.com/sunmeat/aspnetcore_tanstack_table_sorting
- React client: https://github.com/sunmeat/aspnetcore_tanstack_table_sorting/tree/master/react.client
- TanStack Table: https://tanstack.com/table
- TanStack Table Sorting Guide: https://tanstack.com/table/latest/docs/guide/sorting

---

**React + TanStack Table + Vite**

Навчальний приклад сортування таблиць у React із порівнянням ручної реалізації та TanStack Table.
