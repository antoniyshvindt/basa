# Реестр источников

Генерируется из `data/evidence.json`. Дата проверки всех записей — 11.11.2026.

| ID | Тип | Источник | Доступ | Надёжность |
|---|---|---|---|---|
| E-EGISU-NIOKTR | Реестр | [ЕГИСУ НИОКТР — регистрационные карточки НИОКТР (открытые данные)](https://www.rosrid.ru/) | коннектор egisuopen (PostgreSQL, схема raw: nioktrs_post, nioktrs_get) | первичный |
| E-EGISU-RID | Реестр | [ЕГИСУ НИОКТР — карточки РИД](https://www.rosrid.ru/) | коннектор egisuopen (raw.rids_post) | первичный |
| E-EGISU-DISS | Реестр | [ЕГИСУ НИОКТР — диссертации](https://www.rosrid.ru/) | коннектор egisuopen (raw.dissertations_post) | первичный |
| E-EGISU-FP | Справочник | [ЕГИСУ НИОКТР — справочник национальных и федеральных проектов (national-federal-project-tree)](https://www.rosrid.ru/) | коннектор egisuopen | первичный |
| E-EGISU-VNT | Справочник | [ЕГИСУ НИОКТР — справочники сквозных и критических технологий по Указу № 529](https://www.rosrid.ru/) | коннектор egisuopen (end-to-end-technology, critical-technology-529) | первичный |
| E-RSF-CONTESTS | Портал | [РНФ: перечень конкурсов (конкурсы № 3052 и 3051 — НПТЛ «Средства производства и автоматизации»)](https://rscf.ru/contests/) | прямой запрос к rscf.ru (после разрешения хоста) | первичный |
| E-RSF-3052-NOTICE | Документ | [РНФ: объявление о конкурсе № 3052 (PDF)](https://rscf.ru/upload/iblock/c3f/wjas7jqegf655c2bvly8zin25y1m13j6.pdf) | rscf.ru | первичный |
| E-RSF-3052-DOC | Документ | [РНФ: конкурсная документация № 3052, приложение № 2 — технические требования лота (PDF)](https://rscf.ru/upload/iblock/9df/p70mzn2r3b7a0i9rmdz3jt71z3457f8q.pdf) | rscf.ru | первичный |
| E-EU-2023-1214 | НПА | [Регламент Совета (ЕС) 2023/1214 — Приложение VII, часть A, кат. VIII: X.A.VIII.005.a (аддитивное оборудование для металлических деталей, в т.ч. порошковые системы SLM/DMLS/EBM)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023R1214) | eur-lex.europa.eu | первичный |
| E-EU-2025-1494 | НПА | [Регламент Совета (ЕС) 2025/1494 — Приложение VII, часть B, табл. 5 «Станки, аддитивное оборудование и связанные позиции» (CN 8485 20, 8485 30, 8485 90)](https://eur-lex.europa.eu/eli/reg/2025/1494/oj/eng) | eur-lex.europa.eu | первичный |
| E-ECFR-746 | НПА | [eCFR 15 CFR Part 746, Supplement No. 4 — HTS-6 коды, требующие лицензии для России и Беларуси (редакция на 01.11.2026)](https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-746/appendix-Supplement%20No.%204%20to%20Part%20746) | API www.ecfr.gov | первичный |
| E-CROSSREF | Библиография | [Crossref REST API — публикации по LPBF с аффилиацией российских организаций (2019–2026)](https://api.crossref.org/) | api.crossref.org | первичный (метаданные издателей) |
| E-WEB-RSF | Документ | [РНФ: презентация программы по НП «Средства производства и автоматизации» (31.10.2025) и конкурсная документация](https://rscf.ru/fondfiles/TP_automatizacia_31_10.pdf) | веб-поиск | первичный (по выдаче поиска, файл не открыт) |
| E-SUDACT-1649 | НПА | [Решение Минпромторга России № 22-68462-00692-Р, версия 7 от 03.07.2026 (субсидии на НИОКР по современным технологиям)](https://sudact.ru/law/reshenie-minpromtorga-rossii-ot-29022024-n-22-68462-00692-r/) | sudact.ru (ссылка предоставлена пользователем) | вторичный (публикация полного текста), сверено с реквизитами |
| E-WEB-1649 | НПА | [Решение Минпромторга России от 17.02.2026 № 22-68462-00692-Р](https://rulaws.ru/acts/Reshenie-Minpromtorga-Rossii-ot-17.02.2026-N-22-68462-00692-R/) | веб-поиск | вторичный (агрегатор НПА) |
| E-WEB-GISP | Портал | [ГИСП: карточка меры поддержки (решение 22-68462-00692-Р)](https://gisp.gov.ru/nmp/measure/6616914/pdf) | веб-поиск | первичный (по выдаче) |
| E-WEB-FSI | СМИ/дайджест | [«Станкостроителям раздадут до 30 млн рублей» (17.02.2026); дайджест «Иннопрактики» 20.02.2026; положение «Развитие-Станкостроение» (очередь 4)](https://www1.ru/news/2026/02/17/stankostroiteliam-razdadut-do-30-mln-rublei-na-novye-razrabotki.amp.html) | веб-поиск | вторичный |
| E-WEB-FRP | Материал вуза | [НГТУ: меры поддержки (08.2026) — программы ФРП](https://www.nstu.ru/static_files/112402/support_measures_08.2026.pdf) | веб-поиск | вторичный |
| E-WEB-CENTERS | СМИ | [Центры развития станкостроения создадут НГТУ и ОмГТУ (04.04.2026)](https://www1.ru/news/2026/04/04/centry-razvitiia-stankostroeniia-sozdadut-ngtu-i-omgtu.html) | веб-поиск | вторичный |
| E-WEB-PROFILE | СМИ | [Профиль: «Печать металлом — полноценный инструмент серийного производства» (29.07.2026) — «Лазерные системы», M-450-L](https://profile.ru/scitech/aleksej-kim-pechat-metallom-eto-polnocennyj-instrument-serijnogo-proizvodstva-1841603/amp/) | веб-поиск | вторичный |
| E-WEB-RUSMELT | СМИ | [Росатом представил компактный 3D-принтер RusMelt 150M (13.05.2026)](https://www1.ru/news/2026/05/13/rosatom-udeshevil-pechat-metallom-kompaniia-predstavila-kompaktnyi-3d-printer-rusmelt-150m.html) | веб-поиск | вторичный |
| E-WEB-RUSAT-LASER | СМИ | [RusAT unveils line of lasers for metal 3D printing (3DPrint.com)](https://3dprint.com/280393/rusat-unveils-line-of-lasers-for-metal-3d-printing/) | веб-поиск | вторичный |
| E-WEB-EU833 | НПА | [Регламент Совета (ЕС) 833/2014, консолидированный текст; Регламент 2025/1494](https://eur-lex.europa.eu/eli/reg/2025/1494/oj/eng) | веб-поиск | первичный (не открыт в сессии) |
| E-WEB-BIS | НПА | [BIS: правила по России и Беларуси (Federal Register 2024-13148 и др.), Supplement No. 4 to Part 746](https://govinfo.gov/content/pkg/FR-2024-06-18/pdf/2024-13148.pdf) | веб-поиск | первичный (не открыт в сессии) |
| E-WEB-PAT-EOS | Патентная выдача | [Поиск патентов на рекотеры (Justia assignee EOS GmbH, USPTO Official Gazette)](https://patents.justia.com/assignee/eos-gmbh) | веб-поиск | вторичный (реестр не открыт) |
| E-WEB-PAT-MPM | Патентная выдача | [Поиск патентов на мониторинг ванны (USPTO ppubs по выдаче)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10914677) | веб-поиск | вторичный (реестр не открыт) |
| E-NE-MAP | Геоданные | [Natural Earth 1:50m (world-atlas@2.0.2) — контур России](https://github.com/topojson/world-atlas) | npm | первичный |

## Правила

- Сведения карточек ЕГИСУ показываются как первоисточник; аналитическая разметка помечена отдельно.
- Вторичные источники используются только с пометкой и требованием сверки.
- Патентные документы из поисковой выдачи имеют уровень подтверждения C.
