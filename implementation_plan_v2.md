# Plan Aktualizacji – Casino Star (Nowe Mechaniki i Rozrywka)

Wprowadzamy rozbudowaną mechanikę audio, pasek zadowolenia, zakładkę rozrywki z mafijnym/brudnym humorem, system ekwipunku (plecak) oraz zmodyfikowane prawdopodobieństwa RNG gier w zależności od stanu psychicznego.

---

## 1. Zmiany w Mechanice i Zależnościach

### Blokada Gier w Kasynie
*   **Logika:** Jeśli jakikolwiek pasek potrzeb (Sen, Najedzenie, Nawodnienie, Zadowolenie) spadnie do **0**, gracz **nie może** rozpocząć nowej gry w Blackjacka (solo/ranked) ani na Automatach.
*   **Wizualizacja:** Przyciski do gry (np. "Graj", "SPIN") będą wyłączone (disabled) z jasnym komunikatem ostrzegawczym, np. *„Jesteś zbyt wycieńczony/smutny, aby grać! Zadbaj o swoje potrzeby.”*

### Stan psychiczny (Zadowolenie) a szanse w Kasynie
Stan psychiczny bezpośrednio wpływa na szczęście gracza. Im gracz jest smutniejszy, tym system bezlitośnie obniża jego szanse:
*   **Zadowolenie <= 20%:** **85% szans na natychmiastową przegraną** (serwer sztucznie koryguje RNG w kartach/bębnach na korzyść kasyna).
*   **Zadowolenie <= 10%:** **99% szans na natychmiastową przegraną** (praktycznie zerowe szanse na wygraną, kasyno zawsze wygrywa).
*   **Zadowolenie > 20%:** Standardowe, w 100% uczciwe i losowe RNG.

---

## 2. Nowa Zakładka: ROZRYWKA (Entertainment)
Dostępne opcje regeneracji zadowolenia:

| Aktywność | Koszt (Żetony) | Efekt | Ryzyko / Uwagi |
|---|---|---|---|
| **„Walenie konia”** | 0 | +5 Zadowolenia | – |
| **Kino** | 30 | +30 Zadowolenia | – |
| **Randka z Tindera** | 120 | +50 Zadowolenia, +50 Najedzenia, +50 Nawodnienia | – |
| **Stripclub** | 150 | +100 Zadowolenia, +100 Nawodnienia | **20% szans** na wpadkę: dług alimentacyjny `-250 żetonów` (aborcja) |

---

## 3. System Plecaka (Ekwipunek podręczny)

*   **Zakup:** W Sklepie pojawia się nowa kategoria **NARZĘDZIA**. Można tam kupić **Plecak** za `30 żetonów`.
*   **Mechanika:** 
    *   Bez plecaka gracz może kupować przedmioty spożywcze tylko wtedy, gdy posiada **Kawalerkę** (wtedy trafiają do lodówki w domu).
    *   Kupno **Plecaka** odblokowuje podręczny slot (zawsze widoczny po lewej stronie ekranu w UI).
    *   Plecak pozwala schować maksymalnie **5 artykułów spożywczych** (woda, kebab itp.) i spożywać je w dowolnym miejscu, bez konieczności wracania do domu.

---

## 4. Audio i Lepsza Oprawa Wizualna
*   **Muzyka w tle:** Klimatyczny retro jazz w pętli (włączany/wyłączany przyciskiem w UI).
*   **Efekty SFX:**
    *   Rozdawanie kart (szelest).
    *   Wygrana w blackjacku (dźwięk sypiących się monet).
    *   Automat (dźwięk obracających się bębnów).
    *   McDonald's (dźwięk smażenia burgera/kliku).
