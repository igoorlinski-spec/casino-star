# Casino Star 🎰
Mafijna gra przeglądarkowa online multiplayer.

## 🚀 Uruchomienie lokalne krok po kroku

### Wymagania
* Node.js (wersja 18+)
* PostgreSQL (zainstalowany lokalnie lub zdalna baza danych)

---

### KROK 1: Konfiguracja Bazy Danych
W folderze `backend` skopiuj plik `.env.example` jako `.env`:
```env
DATABASE_URL="postgresql://LOGIN:HASLO@localhost:5432/casinostar?schema=public"
JWT_SECRET="tajny-klucz-mafijny-123"
PORT=4000
```
Uzupełnij `DATABASE_URL` swoimi danymi do bazy PostgreSQL.

---

### KROK 2: Uruchomienie Backend Core
1. Wejdź do folderu backendu:
   ```powershell
   cd backend
   ```
2. Zainstaluj zależności:
   ```powershell
   npm install
   ```
3. Wygeneruj klienta Prisma oraz przeprowadź migrację bazy danych:
   ```powershell
   npx prisma migrate dev --name init
   ```
4. Uruchom serwer w trybie deweloperskim:
   ```powershell
   npm run dev
   ```
   *Serwer nasłuchuje na porcie `4000`.*

---

### KROK 3: Uruchomienie Frontend Client
1. Otwórz nowe okno terminala i przejdź do folderu frontendu:
   ```powershell
   cd frontend
   ```
2. Zainstaluj zależności:
   ```powershell
   npm install
   ```
3. Uruchom aplikację:
   ```powershell
   npm run dev
   ```
   *Aplikacja otworzy się na porcie `3000` (lub `5173`). Wejdź na [http://localhost:3000](http://localhost:3000).*

---

## ☁️ Deployment na Render (Chmura)
1. Wrzuć kod na swoje repozytorium GitHub.
2. Połącz Render z GitHubem.
3. Render automatycznie wykryje plik `render.yaml` w głównym katalogu i skonfiguruje:
   * Bazę danych PostgreSQL
   * Backend Web Service z zmienną `DATABASE_URL` i autogenerowanym `JWT_SECRET`
   * Frontend Static Site z proxy do backendu
