# Omnichannel Inbox — Phase 2 Design Spec
# Date: 2026-04-18
# Status: Brainstorming approved, awaiting implementation plan

---

## 1. Scope

Допрацювання існуючого Phase 1 (Telegram/Email/SMS/e-chat + SSE UI) з такими блоками:
1. **UX реструктуризація** — нова навігація, пріоритетна черга, логічна організація вимірів
2. **File Storage** — Cloudflare R2, два bucket (public + private), FileService
3. **Media Composer** — фото, відео, голосові, документи з реальним upload
4. **Швидкі відповіді (шаблони)** — Quick Replies з пошуком і збереженням
5. **Вкладки в чаті** — Чат / Нотатки / Email
6. **Контекстна панель** — розширена (теги, попередні діалоги, призначений менеджер)

Phase 2 Meta (FB/IG/WA) — окремий task (TASK-6), не входить в цей scope.

---

## 2. Navigation Architecture — два незалежні виміри

### Проблема Phase 1
Tabs "Нові / Мої / Всі / Закриті" (ownership) і групи "Очікують / Активні" (priority) — два виміри на одному рівні. Порушує P2 (Zero Cognitive Load).

### Рішення: вимір 1 в лівій навігації, вимір 2 всередині списку

#### Ліва навігація (ownership + alarm)

```
🔴 Без відповіді     [3]   ← ALARM: завжди зверху, вся команда, таймер
─────────────────────────
Моя черга
  👤 Призначено мені  [14]
─────────────────────────
Всі відкриті
  💬 Відкриті         [47]
  ✓  Закриті          [120]
  🚫 Спам             [4]
─────────────────────────
Збережені фільтри
  📌 Instagram Polyana
  📌 Bukovel TG
  + Новий вигляд...
```

**По дефолту відкривається "Призначено мені"** (P18 Focus Mode Default).

#### "Без відповіді" — особлива роль (alarm, не view)
- Показує **всю команду** (не тільки моє)
- Таймер: 🔴 червоний >1год, 🟡 помаранчевий >30хв
- Team Lead бачить хто не відповів
- Ціль менеджера: 0 у цій секції (P19 End-of-Day Zero)

#### Вимір 2 — всередині будь-якого view
Групування в списку діалогів:
```
🔴 БЕЗ ВІДПОВІДІ · N   ← підсекція зверху
[діалоги з таймером]

РЕШТА · N
[решта за lastMessageAt DESC]
```

#### Фільтри (Канал / Менеджер / Дата)
- Не навігація — контекстне **уточнення** поточного view
- URL-based через nuqs (D11) — shareable посилання
- Можна зберегти як новий вигляд (📌)

---

## 3. Conversation List Item

Кожен елемент списку показує:
```
[Avatar + channel icon] [Ім'я гостя]           [час / таймер]
                        [preview тексту]
                        [property badge] [assigned manager] [unread badge]
```

- Channel icon: мала іконка каналу в правому нижньому куті аватара
- Таймер (тільки для "без відповіді"): червоний/помаранчевий
- Property badge: Polyana / Polianytsia / Zatoka / Villa
- Assigned manager: ім'я скорочено

---

## 4. Chat Header

```
[Avatar] [Ім'я] [канал · property · статус активності]    [Призначити] [Статус▾] [✓ Завершити] [⋯]
```

---

## 5. Tabs всередині чату

```
💬 Чат  |  📝 Нотатки  |  📧 Email
```

- **Чат** — основна вкладка, повідомлення каналу
- **Нотатки** — внутрішні нотатки (не відправляються гостю), видно тільки команді
- **Email** — якщо до гостя є email-thread, показує його окремо

---

## 6. Message Composer — Media Support

### Поточна проблема
`blob:` URL в attachments — файл не зберігається після відправки. **Broken в Phase 1.**

### Нова архітектура

**Upload flow:**
1. Менеджер вибирає файл
2. `POST /api/upload/presigned` → сервер генерує presigned PUT URL до R2
3. Браузер робить `PUT` прямо до R2 (не через сервер)
4. Повертає `{ key, url }` — CDN URL (public) або key (private)
5. `url` зберігається в `Message.attachments` JSON

**Composer кнопки:**
```
📎 Файл/фото   🎙 Голосове   🎥 Відео-кружечок   😊 Emoji
```

**Голосове повідомлення:**
- Кнопка 🎙 → `MediaRecorder API` → запис прямо в браузері
- Відображення: аудіо плеєр з waveform (бібліотека `wavesurfer.js` або простий `<audio>`)
- Upload до R2 public bucket як `.webm`/`.ogg`

**Відео-кружечок (Telegram video note):**
- Тільки для Telegram каналів
- Записується через `getUserMedia` (камера) → `.mp4` кружечок
- Upload до R2, відправляється як `sendVideoNote` в Telegram API

**Attachments preview над полем вводу:**
- Зображення: thumbnail
- Аудіо: плеєр
- Відео: thumbnail + play
- Файл: іконка + ім'я + розмір + ✕

### Quick Replies (шаблони)
```
Шаблони: [🏷 Ранній заїзд] [💰 Прайс травень] [🛏 Опис номерів] [+ Зберегти]
```

- Bar над textarea, горизонтальний scroll
- `#` в textarea → dropdown пошук шаблонів (як Notion slash commands)
- Шаблон підтримує `{{ім'я}}`, `{{дата}}` змінні
- "Зберегти поточне повідомлення як шаблон" одним кліком
- Шаблони зберігаються в БД (нова таблиця `QuickReply`)

---

## 7. Right Context Panel

```
ГІСТЬ
  [Avatar] Ім'я / @username
  Канал | Перша поява | Всього діалогів | Телефон
  [Редаг.] [Об'єднати]

БРОНЮВАННЯ
  [Картка активного замовлення зі статусом]
  [+ Додати картку у воронку]

ПРИЗНАЧЕНО
  [Avatar менеджера] Ім'я · роль
  [Перепризначити]

ТЕГИ
  [tag1] [tag2] [+ Тег]

ПОПЕРЕДНІ ДІАЛОГИ
  [список попередніх конверсацій з цим гостем]
```

---

## 8. File Storage Architecture — Cloudflare R2

### Два bucket

| Bucket | Назва | Доступ | Використання |
|--------|-------|--------|-------------|
| Public | `ruta-public` | CDN публічний | Inbox медіа що відправляємо гостям, фото номерів, прайси, брошури |
| Private | `ruta-private` | Тільки presigned URL (15хв TTL) | Скани паспортів, реєстраційні картки, внутрішні документи |

### CDN домен
- Public: `cdn.ruta.cam` → R2 public bucket (Cloudflare Workers або R2 custom domain)
- Private: тільки через `GET /api/files/[key]` server endpoint → генерує fresh presigned URL

### FileService (`src/server/services/file-service.ts`)

```typescript
class FileService {
  // Генерує presigned PUT URL для upload з браузера
  getUploadUrl(bucket: 'public' | 'private', key: string, mime: string): Promise<{ uploadUrl: string, fileUrl: string }>

  // Для private: генерує presigned GET URL (15хв)
  getDownloadUrl(key: string): Promise<string>

  // Видалення (soft через DB, hard через R2)
  deleteFile(key: string, bucket: 'public' | 'private'): Promise<void>
}
```

### Key naming convention
```
inbox/{conversationId}/{messageId}/{filename}     ← public медіа чатів
documents/{guestId}/passport/{filename}           ← private документи
orders/{orderId}/attachments/{filename}           ← private документи замовлень
media/{propertySlug}/{category}/{filename}        ← public медіа готелів
```

### Env vars (нові)
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=ruta-public
R2_PRIVATE_BUCKET=ruta-private
R2_PUBLIC_CDN_URL=https://cdn.ruta.cam
```

### Schema зміна (Message.attachments)
Поточний тип `Json` зберігає blob URLs — треба мігрувати на:
```typescript
type Attachment = {
  key: string        // R2 object key
  url: string        // CDN URL (public) або '/api/files/[key]' (private)
  mime: string
  name: string
  size: number
  bucket: 'public' | 'private'
}
```

---

## 9. Нові DB таблиці/поля

### QuickReply (нова таблиця)
```prisma
model QuickReply {
  id        String   @id @default(cuid())
  brandId   String?  // null = глобальний для всіх properties
  title     String   // "Ранній заїзд"
  content   String   // текст шаблону з {{змінними}}
  shortcut  String?  // "#early" для пошуку
  createdBy String
  createdAt DateTime @default(now())
}
```

### ConversationNote (нова таблиця)
```prisma
model ConversationNote {
  id             String   @id @default(cuid())
  conversationId String
  content        String
  createdById    String
  createdAt      DateTime @default(now())
}
```

---

## 10. UX Principles Compliance

| Принцип | Як виконується |
|---------|---------------|
| P2 Zero Cognitive Load | Два виміри на двох рівнях, не перетинаються |
| P15 Always Next Action | "Без відповіді" alarm завжди видимий |
| P18 Focus Mode Default | По дефолту відкривається "Призначено мені" |
| P19 End-of-Day Zero | Ціль = 0 у "Без відповіді" |
| D11 URL state | Фільтри через nuqs → shareable |
| D8 Optimistic UI | Toggle assign/resolve — optimistic |
| P3 Above the Fold | Контекст гостя + бронювання в правій панелі |

---

## 11. Keyboard Shortcuts (вже в docs/ux-principles.md)

```
J/K   — наступна/попередня розмова
E     — архівувати
A     — призначити мені
⇧A    — призначити комусь
⌘Enter — надіслати
C     — нова розмова
/     — фокус пошуку
#     — відкрити quick replies
```

---

## 12. Out of Scope (для цього task)

- Meta adapters (FB/IG/WA) → TASK-6
- AI suggestions (⌘J) → Phase 5
- SMS inbound → потребує окремого номера TurboSMS
- Mobile app → окремий проект
- Analytics/reporting inbox → TASK-10 BI

---

## 13. Implementation Order (для writing-plans)

1. **FileService + R2 buckets** — фундамент, блокує media
2. **Navigation refactor** — нова структура лівої панелі
3. **Conversation list** — пріоритетна черга, таймери, property badge
4. **Chat tabs** — Чат / Нотатки / Email
5. **Media composer** — реальний upload, голосові, відео
6. **Quick Replies** — таблиця QuickReply, bar, # shortcut
7. **Context panel** — теги, попередні діалоги, перепризначення
8. **Prisma migration** — Message.attachments schema, QuickReply, ConversationNote
9. **E2E tests** — upload flow, quick replies, nav structure
