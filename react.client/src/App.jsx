import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    useTable,
    tableFeatures,
    rowSortingFeature,
    createSortedRowModel,
    createColumnHelper,
} from '@tanstack/react-table';

import './App.css';

const API_BASE_URL = '/api';

/* ==========================================================================
 * СОРТУВАННЯ ТАБЛИЦІ ГРАВЦІВ — 3 підходи
 * ==========================================================================
 *
 * 1) ПОВНІСТЮ ВРУЧНУ:
 *    - зберігаємо { key, direction } у useState;
 *    - по кліку на заголовок стовпця перемикаємо напрямок (asc <-> desc),
 *      або встановлюємо новий ключ сортування з напрямком 'asc';
 *    - стрілка ▲/▼ показується тільки біля того заголовка, чий key === sortConfig.key.
 *    Плюси: нуль залежностей, повний контроль, доволі легко зрозуміти.
 *    Мінуси: при великих таблицях (пагінація, фільтри, вкладені сортування,
 *    virtualized rows) доведеться вручну писати дедалі більше логіки.
 *
 * 2) ТОП-1 БІБЛІОТЕКА ДЛЯ ЦІЄЇ ЗАДАЧІ: @tanstack/react-table
 *    Це найпопулярніша headless-бібліотека для таблиць у React-екосистемі
 *    Вона не рендерить розмітку сама —
 *    ви отримуєте готову логіку (сортування, фільтрація, пагінація,
 *    групування, virtualization) і самі керуєте JSX/стилями.
 *
 *    Встановлення:
 *        npm install @tanstack/react-table
 *
 * 3) АЛЬТЕРНАТИВНІ БІБЛІОТЕКИ для сортування/роботи з таблицями в React:
 *    - AG Grid (ag-grid-react)  — потужний enterprise-грід (сортування,
 *                                  фільтри, редагування, virtualization),
 *                                  частина функцій платна.
 *    - MUI X DataGrid           — готовий компонент таблиці з Material UI,
 *                                  сортування "з коробки" через пропси.
 *    - react-data-table-component — простий готовий компонент таблиці
 *                                  з вбудованим сортуванням/пагінацією,
 *                                  менше налаштувань, ніж у TanStack Table.
 * ==========================================================================
 */

// helper для типобезпечного й лаконічного опису стовпців таблиці гравців.
const columnHelper = createColumnHelper();

// v9: один раз "збираємо" набір можливостей таблиці — тут потрібне лише
// сортування рядків (rowSortingFeature) і його row model (createSortedRowModel).
const playersTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
});

export default function App() {
    const [activeTab, setActiveTab] = useState('players');
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [playerForm, setPlayerForm] = useState({ id: 0, name: '', age: '', position: '', teamId: '' });
    const [teamForm, setTeamForm] = useState({ id: 0, name: '', coach: '' });
    const [isEditing, setIsEditing] = useState(false);

    // ==========================================================================
    // ПОЧАТОК — ВАРІАНТ 1: ПОВНІСТЮ РУЧНЕ СОРТУВАННЯ
    // приклад для порівняння з варіантом 2
    // (@tanstack/react-table), який реально працює нижче. щоб увімкнути
    // цей варіант замість бібліотечного — розкоментуйте цей блок і
    // приберіть/закоментуйте блок "ВАРІАНТ 2" далі по файлу
    // ==========================================================================
    /*
    // КРОК 1. стан сортування: за яким полем зараз сортуємо ('id' | 'name' |
    // 'age' | 'position' | 'team' | null) і в якому напрямку ('asc' | 'desc').
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // КРОК 2. обробник кліку по заголовку стовпця:
    // - якщо клікнули по тому самому стовпцю — перемикаємо напрямок;
    // - якщо по новому — починаємо сортування із зростання ('asc').
    const handleSort = (key) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    // КРОК 3. рендер іконки-стрілки — тільки біля активного стовпця сортування.
    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return <span className="sort-arrow">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    // КРОК 4. обчислення відсортованого масиву гравців:
    // - useMemo, щоб не пересортовувати на кожен рендер без потреби;
    // - копіюємо масив ([...players]), щоб не мутувати оригінальний стан;
    // - рядки порівнюємо через toLowerCase(), числа — напряму
    const sortedPlayers = useMemo(() => {
        if (!sortConfig.key) return players;

        const { key, direction } = sortConfig;
        const factor = direction === 'asc' ? 1 : -1;

        return [...players].sort((a, b) => {
            let valueA = a[key];
            let valueB = b[key];

            if (typeof valueA === 'string' || typeof valueB === 'string') {
                valueA = (valueA ?? '').toString().toLowerCase();
                valueB = (valueB ?? '').toString().toLowerCase();
            } else {
                valueA = valueA ?? 0;
                valueB = valueB ?? 0;
            }

            if (valueA < valueB) return -1 * factor;
            if (valueA > valueB) return 1 * factor;
            return 0;
        });
    }, [players, sortConfig]);
    */
    // ==========================================================================
    // КІНЕЦЬ — ВАРІАНТ 1: ПОВНІСТЮ РУЧНЕ СОРТУВАННЯ - ~50 рідків
    // ==========================================================================

    // ==========================================================================
    // ПОЧАТОК — ВАРІАНТ 2: СОРТУВАННЯ ЧЕРЕЗ @tanstack/react-table
    // ==========================================================================

    // КРОК 1. опис стовпців гравців, за якими дозволено сортувати.
    // accessor('id', ...) означає "бери значення item.id для цього стовпця".
    // useMemo — щоб масив стовпців не перестворювався на кожен рендер
    const playersColumns = useMemo(
        () => [
            columnHelper.accessor('id', { header: 'ID' }),
            columnHelper.accessor('name', { header: "Ім'я" }),
            columnHelper.accessor('age', { header: 'Вік' }),
            columnHelper.accessor('position', { header: 'Позиція' }),
            columnHelper.accessor('team', { header: 'Команда' }),
        ],
        []
    );

    // КРОК 2. стан сортування у форматі, якого очікує сама бібліотека:
    // масив вигляду [{ id: 'name', desc: false }] (порожній масив = без сортування).
    const [sorting, setSorting] = useState([]);

    // КРОК 3. екземпляр таблиці: віддаємо dані, стовпці й раніше зібраний
    // набір features (v9). getCoreRowModel окремо передавати не потрібно —
    // у v9 базова row model підключається автоматично; sortedRowModel уже
    // зареєстровано у playersTableFeatures вище.
    const playersTable = useTable({
        features: playersTableFeatures,
        data: players,
        columns: playersColumns,
        state: { sorting },
        onSortingChange: setSorting,
    });

    // КРОК 4. готовий відсортований масив гравців — саме його рендеримо в <tbody>
    const sortedPlayers = playersTable.getRowModel().rows.map((row) => row.original);

    // КРОК 5. обробник кліку на заголовок стовпця — бере готовий handler
    // прямо з колонки таблиці (сама перемикає напрямок при повторному кліку).
    const getSortHandler = (key) => playersTable.getColumn(key)?.getToggleSortingHandler();

    // КРОК 6. іконка-стрілка: бібліотека сама знає поточний напрямок
    // ('asc' | 'desc' | false) для кожного стовпця.
    const renderSortIcon = (key) => {
        const direction = playersTable.getColumn(key)?.getIsSorted();
        if (!direction) return null;
        return <span className="sort-arrow">{direction === 'asc' ? '▲' : '▼'}</span>;
    };
    // ==========================================================================
    // КІНЕЦЬ — ВАРІАНТ 2: СОРТУВАННЯ ЧЕРЕЗ @tanstack/react-table - ~25 рядків
    // ==========================================================================

    const resetForm = useCallback(() => {
        setPlayerForm({ id: 0, name: '', age: '', position: '', teamId: '' });
        setTeamForm({ id: 0, name: '', coach: '' });
        setIsEditing(false);
    }, []);

    const refreshTeamOptions = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/teams`);
            if (!response.ok) return;
            const data = await response.json();
            setTeamOptions(data);
        } catch {
            setTeamOptions([]);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = activeTab === 'players' ? 'players' : 'teams';
            const response = await fetch(`${API_BASE_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`Помилка завантаження: ${response.statusText}`);
            const data = await response.json();
            if (activeTab === 'players') setPlayers(data);
            else setTeams(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        let ignore = false;
        const load = async () => {
            resetForm();
            setSorting([]);
            setLoading(true);
            setError(null);
            try {
                const endpoint = activeTab === 'players' ? 'players' : 'teams';
                const response = await fetch(`${API_BASE_URL}/${endpoint}`);
                if (!response.ok) throw new Error(`Помилка завантаження: ${response.statusText}`);
                const data = await response.json();

                if (activeTab === 'players') {
                    const teamsResponse = await fetch(`${API_BASE_URL}/teams`);
                    const teamsData = teamsResponse.ok ? await teamsResponse.json() : [];
                    if (!ignore) {
                        setPlayers(data);
                        setTeamOptions(teamsData);
                    }
                } else {
                    if (!ignore) {
                        setTeams(data);
                        setTeamOptions(data);
                    }
                }
            } catch (err) {
                if (!ignore) setError(err.message);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        load();
        return () => { ignore = true; };
    }, [activeTab, resetForm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isPlayer = activeTab === 'players';
        const endpoint = isPlayer ? 'players' : 'teams';
        const formData = isPlayer
            ? { ...playerForm, age: Number(playerForm.age), teamId: playerForm.teamId ? Number(playerForm.teamId) : null }
            : teamForm;
        const url = isEditing ? `${API_BASE_URL}/${endpoint}/${formData.id}` : `${API_BASE_URL}/${endpoint}`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error('Не вдалося зберегти дані');
            resetForm();
            fetchData();
            if (!isPlayer) refreshTeamOptions();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        if (activeTab === 'players') {
            setPlayerForm({
                id: item.id,
                name: item.name || '',
                age: item.age ?? '',
                position: item.position || '',
                teamId: item.teamId ?? '',
            });
        } else {
            setTeamForm({
                id: item.id,
                name: item.name || '',
                coach: item.coach || '',
            });
        }
    };

    const [confirmDialog, setConfirmDialog] = useState(null);

    const requestDelete = (id, name) => {
        setConfirmDialog({ id, name });
    };

    const cancelDelete = () => {
        setConfirmDialog(null);
    };

    const confirmDelete = async () => {
        if (!confirmDialog) return;
        const id = confirmDialog.id;
        setConfirmDialog(null);
        const endpoint = activeTab === 'players' ? 'players' : 'teams';
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Помилка при видаленні');
            fetchData();
            if (activeTab === 'teams') refreshTeamOptions();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="app">
            <header className="header">
                <div className="header-inner">
                    <div className="brand">
                        <span className="brand-icon">⚽</span>
                        <div className="brand-text">
                            <span className="brand-title">Футбольна ліга</span>
                            <span className="brand-sub">Менеджер гравців та команд</span>
                        </div>
                    </div>
                    <nav className="nav">
                        <button
                            className={`nav-btn ${activeTab === 'players' ? 'active' : ''}`}
                            onClick={() => setActiveTab('players')}
                        >
                            Гравці
                        </button>
                        <button
                            className={`nav-btn ${activeTab === 'teams' ? 'active' : ''}`}
                            onClick={() => setActiveTab('teams')}
                        >
                            Команди
                        </button>
                    </nav>
                </div>
            </header>

            <main className="main">
                {error && <div className="alert">{error}</div>}

                <div className="layout">
                    <section className="panel form-panel">
                        <div className="panel-head">
                            <h2>{isEditing ? 'Редагувати' : 'Додати'} {activeTab === 'players' ? 'гравця' : 'команду'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="form">
                            {activeTab === 'players' ? (
                                <>
                                    <div className="field">
                                        <label>Ім'я гравця</label>
                                        <input
                                            type="text"
                                            required
                                            value={playerForm.name}
                                            onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                                            placeholder="наприклад, Тимерлан Гусейнов"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Вік</label>
                                        <input
                                            type="number"
                                            required
                                            min="15"
                                            max="50"
                                            value={playerForm.age}
                                            onChange={(e) => setPlayerForm({ ...playerForm, age: e.target.value })}
                                            placeholder="25"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Позиція</label>
                                        <input
                                            type="text"
                                            required
                                            value={playerForm.position}
                                            onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                                            placeholder="наприклад, Форвард"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Команда</label>
                                        <select
                                            value={playerForm.teamId}
                                            onChange={(e) => setPlayerForm({ ...playerForm, teamId: e.target.value })}
                                        >
                                            <option value="">Без команди</option>
                                            {teamOptions.map((team) => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="field">
                                        <label>Назва команди</label>
                                        <input
                                            type="text"
                                            required
                                            value={teamForm.name}
                                            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                            placeholder="наприклад, ФК Чорноморець Одеса"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Тренер</label>
                                        <input
                                            type="text"
                                            required
                                            value={teamForm.coach}
                                            onChange={(e) => setTeamForm({ ...teamForm, coach: e.target.value })}
                                            placeholder="наприклад, Валерій Лобановський"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {isEditing ? 'Зберегти' : 'Створити'}
                                </button>
                                {isEditing && (
                                    <button type="button" className="btn btn-ghost" onClick={resetForm}>
                                        Скасувати
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section className="panel list-panel">
                        <div className="panel-head">
                            <h2>Список {activeTab === 'players' ? 'гравців' : 'команд'}</h2>
                            <span className="count">
                                {(activeTab === 'players' ? players : teams).length} записів
                            </span>
                        </div>

                        {loading ? (
                            <div className="loader">
                                <div className="spinner"></div>
                                <span>Завантаження...</span>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            {activeTab === 'players' ? (
                                                <th className="sortable" onClick={getSortHandler('id')}>
                                                    ID{renderSortIcon('id')}
                                                </th>
                                            ) : (
                                                <th>ID</th>
                                            )}
                                            {activeTab === 'players' ? (
                                                <th className="sortable" onClick={getSortHandler('name')}>
                                                    Ім'я{renderSortIcon('name')}
                                                </th>
                                            ) : (
                                                <th>Команда</th>
                                            )}
                                            {activeTab === 'players' ? (
                                                <>
                                                    <th className="sortable" onClick={getSortHandler('age')}>
                                                        Вік{renderSortIcon('age')}
                                                    </th>
                                                    <th className="sortable" onClick={getSortHandler('position')}>
                                                        Позиція{renderSortIcon('position')}
                                                    </th>
                                                    <th className="sortable" onClick={getSortHandler('team')}>
                                                        Команда{renderSortIcon('team')}
                                                    </th>
                                                </>
                                            ) : (
                                                <th>Тренер</th>
                                            )}
                                            <th>Дії</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(activeTab === 'players' ? sortedPlayers : teams).length === 0 ? (
                                            <tr>
                                                <td colSpan={activeTab === 'players' ? 6 : 4} className="empty">
                                                    Дані відсутні
                                                </td>
                                            </tr>
                                        ) : (
                                            (activeTab === 'players' ? sortedPlayers : teams).map((item) => (
                                                <tr key={item.id}>
                                                    <td className="id">#{item.id}</td>
                                                    <td className="name">{item.name}</td>
                                                    {activeTab === 'players' ? (
                                                        <>
                                                            <td>{item.age}</td>
                                                            <td>
                                                                <span className="badge">{item.position}</span>
                                                            </td>
                                                            <td className="team-name">{item.team || '—'}</td>
                                                        </>
                                                    ) : (
                                                        <td className="coach">{item.coach}</td>
                                                    )}
                                                    <td className="actions">
                                                        <button className="icon-btn edit" onClick={() => handleEdit(item)} title="Редагувати">
                                                            ✎
                                                        </button>
                                                        <button className="icon-btn delete" onClick={() => requestDelete(item.id, item.name)} title="Видалити">
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <span className="brand-icon">⚽</span>
                        <span>Футбольна ліга</span>
                    </div>
                    <p>Приклад на локалізацію: чиста архітектура ASP.NET Core Web API + React</p>
                    <p className="footer-copy">© {new Date().toLocaleString('uk-UA')}</p>
                </div>
            </footer>

            {confirmDialog && (
                <div className="modal-overlay" onClick={cancelDelete}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon">⚠</div>
                        <h3 className="modal-title">Видалити запис?</h3>
                        <p className="modal-text">
                            {activeTab === 'players' ? 'Гравця' : 'Команду'} «{confirmDialog.name}» буде видалено назавжди. Цю дію неможливо скасувати.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={cancelDelete}>
                                Скасувати
                            </button>
                            <button className="btn btn-danger" onClick={confirmDelete}>
                                Видалити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}