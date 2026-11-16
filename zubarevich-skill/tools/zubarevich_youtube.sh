#!/bin/bash
# Выгрузка субтитров выступлений Н. В. Зубаревич с YouTube (запускать на своём Mac).
# Результат: ~/Downloads/zubarevich_youtube/  (тексты .txt) и архив zubarevich_youtube.zip
# Запуск:  bash ~/Downloads/zubarevich_youtube.sh
# Если YouTube начнёт просить вход — перезапустите так:  COOKIES=safari bash ~/Downloads/zubarevich_youtube.sh
#   (для Safari: Системные настройки → Конфиденциальность → Полный доступ к диску → Терминал)
set -u
OUT="$HOME/Downloads/zubarevich_youtube"
VENV="$HOME/.zubarevich_venv"
mkdir -p "$OUT/vtt" "$OUT/txt"

command -v python3 >/dev/null || { echo "Нужен python3: выполните  xcode-select --install  и запустите снова"; exit 1; }
if [ ! -x "$VENV/bin/yt-dlp" ]; then
  echo "Ставлю yt-dlp в $VENV ..."
  python3 -m venv "$VENV" && "$VENV/bin/pip" install -q -U pip yt-dlp || { echo "Не удалось установить yt-dlp"; exit 1; }
fi
YTDLP="$VENV/bin/yt-dlp"
EXTRA=()
[ -n "${COOKIES:-}" ] && EXTRA+=(--cookies-from-browser "$COOKIES")

cat > "$OUT/list.tsv" <<'LISTEOF'
sJ-9L3dsGx4	What Needs to Change in Countries? Natalya Zubarevich on the Downsides of Vast Territories, Regio...
lbPFb8Qg1xg	Natalia Zubarevich on the economy of Russia and the Urals
b3i8C9FEYjg	Зубаревич/ Наталья Зубаревич и Ирина Воробьева / День радио // 20.06.26 @zhivoygvozd Описание 
MEIlZbOVTmE	Natalia Zubarevich and Maxim Kurnikov | BILD Interview
hjh7j6kPYFM	Natalia Zubarevich: "Weve Hit Rock Bottom and Were Lying There" // "Tell Gordeeva"
dQsE6fxfFS4	Миграция, безработица и новая реальность. Интервью с Натальей Зубаревич. Третьим Будешь?
qNGZ2sa02-A	Наталья Зубаревич и Ирина Воробьева / День радио // 20.06.26
3i3w4DNWRkM	«Люди поджались» / Наталья Зубаревич и Григорий Баженов том, как война обеднила регионы
1vndLa1livg	Наталья Зубаревич «Без посредников» + Бунтман и Кузнецов: «Экзамен по истории для получения ВНЖ»
b_MwP-Ed4sU	Наталья Зубаревич / Бедность и нормальная жизнь // 09.12.2022
K1d3-sKoIYU	Natalia Zubarevich on the future of development, leading cities, and infrastructure support
dQHl7yHadVA	Наталья Зубаревич: добыча нефти, дефицит бюджетов, сельское хозяйство, миграция и уход в наличные
3IZvyqD6F6g	Региональное неравенство - Наталья Зубаревич
1EYloewK-LY	Четыре России. Наталья Зубаревич о силе России и её главной боли
OqQJMV3CLL4	Большой обзор ситуации в экономике регионов Юга России в 2026 году || Наталья Зубаревич
IsaD782o_4I	Интервью: Наталья Зубаревич
nbZwE0cv63Y	Special Opinion / Natalia Zubarevich // 01/21/21
umQfXvOrtho	Natalia Zubarevich (Sapere aude, November 27-29, 2014)
81f9ou1-X4w	Особое мнение / Наталья Зубаревич // 22.07.20
dGyTL2Guu4Q	Наталья Зубаревич. Региональное неравенство (2014 г.)
KEjZ55wLw50	Редколлегия / Наталья Зубаревич // 24.09.21
Hci6fGE7Lvw	"The country wants to live for today" | Natalia Zubarevich on real inflation and the economy afte...
WRBJMzY0cvw	Наталья Зубаревич. Что делать? (3 фев. 2015г.)
BmMlPzhfpQs	Зубаревич/ Без посредников / 04.09.26 Наталья Зубаревич @zhivoygvozd Описание 
G85exx7g8DY	Наталья Зубаревич. Итоги года.  Версия регионов. (Финам FM 28 декабря 2010г.)
TMZ9fn2HFTE	После новостей. Регионы в кризис. Наталья Зубаревич.
np26TcfFwCw	"People are tired of putting up with this." Zubarevich on prices, wages, the fuel crisis, and reg...
9Vs_lJhG-iU	Зубаревич Н. В. - Современные тенденции регионального развития - 9. Рынки труда
KA2m5uM-mWU	Зубаревич Н. В. - Современные тенденции регионального развития - 11. Территориальное неравенство
x1R2sqpp8Uo	Семинар «Геополитика и регионы» с участием Натальи Зубаревич (2015г.)
nHvrVHLly4M	Natalia Zubarevich: Regions in the New Economic Conditions
YFf8FJXkIFU	Говорим с Натальей Зубаревич. Чем нам на самом деле надо заняться, чтобы улучшить жизнь в регионах
Cx3APeFYBQk	Лекция Натальи Зубаревич. Экономика и социум регионов как почва для гражданской жизни (Июн. 2014г.)
IoD4Obr-OFM	N. V. Zubarevich - Modern Trends in Regional Development - 3. Industry Markets: Fuel and Energy C...
HpJ3FJC1GsY	Наталья Зубаревич. У регионов нет денег на майские указы (2016г.)
bk7NbrjlMxA	Зубаревич Н. В. - Современные тенденции регионального развития - 2. Трансформация промышленности
l2dsUYSsa3s	Новая реальность: как она влияет на развитие и бюджеты регионов? // Наталья Зубаревич
128EyhgL3pE	Zubarevich. Regional Economy 2025-2026
T1idKCu0tNk	Zubarevich N.V. - Modern trends of regional development - 6. Agriculture
XVUlbB4tpWg	Наталья Зубаревич. Почему регионы России такие разные: демография, экономика, социум
A75IQKNGoKU	«Потапенко будит!», Наталья Зубаревич, Экономика российских городов и финансовое положение регионов
ppNv5MEKXNE	Зубаревич Н. В. - Современные тенденции регионального развития - 10. Доходы населения и потребление
ARZ7mQIr27I	26.03.2016  / КонцептХаб / Наталья Васильевна Зубаревич / полная лекция
TSJZ0POFTGw	Лекция Натальи Зубаревич. Новая реальность 2014 г. Как она влияет на развитие и бюджеты регионов.
vp1LBo1UBaU	Natalia Zubarevich. Regional Economy
JynIOjgLO3U	Zubarevich N.V. - Modern trends in regional development -4. Industry markets: new exporters
7ohD5pAU6ag	Natalia Zubarevich on budget shortfalls and who will pay for the presidents May decrees
qW8HFMzI-EQ	Лекция Натальи Зубаревич.  Новая реальность: как она влияет на развитие и бюджеты регионов? (2015г.)
LzTFjb8H8nc	Развитие городов — Наталья Зубаревич
5ydP0dXyE2I	Лекция  Наталья Зубаревич  Депрессия в региональном измерении (2016г.)
fvI_C1wCWQI	ZUBAREVICH. We didnt expect such a revelation! What is the state of regional budgets?
3M33tVYhriY	Встреча с Зубаревич Н.В. 21.09.2016
9WDbgiWE29I	Наталья Зубаревич про бюджеты регионов, доходы населения, зарплатную гонку и подорожание образования
BurfWcBY0D4	Наталья Зубаревич про бюджеты регионов, доходы населения, зарплатную гонку и подорожание образования
A5EnyvcIh9o	Natalia Zubarevich. Slowing Growth. Analyzing Statistics. Economic Results for Q1 and Q2
RIEDWfkiTnk	Открытие проекта/Онлайн-лекция Натальи Васильевны Зубаревич
UKSPCfbKrdY	Наталья Зубаревич (Sapere Aude, Голицыно, 11-14 марта 2015)
rM0quuCrLzE	НАТАЛЬЯ ЗУБАРЕВИЧ. Сильнее пострадают бюджеты более развитых регионов.
QZq8L7Pbfno	Наталья Зубаревич. Индексация зарплат. Мобилизация и рынок труда.
LWebfFsJw4c	«Прав!Да?» гость передачи — Наталья Зубаревич, экономист. Эфир от 29.01.2018 г.
Y9mvanMMKSk	Дневной разворот: Возвращение проекта «Лекции в Политехническом». Гость - Наталья Зубаревич
f2-VmgAfuXY	Наталья Зубаревич - эксперт, которому доверяют!
Vj2giIsBH2Q	What is happening with Russias economy in 2026? Natalia Zubarevich
9u8dbCiOP90	ZUBAREVICH: "Now comes the most interesting part." What will happen in 2026, like with oil, regio...
2moFjh2CRZM	Natalia Zubarevich: "The Economy of Russian Industries and Regions in 2025 and Early 2026"
pZ62VNcxKzg	«Мы на дне уже»? Что ждет Россию в 2026 | Наталья Зубаревич о серьезных проблемах экономики и людей
2CFVKcyOyF4	ZUBAREVICH MASTER CLASS
Bk-N5f4zODU	Natalia Zubarevich: The Economy of Russian Industries and Regions in 2025-2026 / Kotomodern is Wa...
BevbhjkDKck	2026 хуже 2025? Зубаревич о блокировке интернета, дыре в бюджете и убытках бизнеса
inP4GQAn25o	"Weve Already Hit Bottom" — Zubarevich: War is destroying the Russian economy. What awaits peopl...
5hNWIx0cF2o	Бензиновый кризис ударил по регионам. Мираторг после ящура. Дефицит бюджета. Рост фармы / Зубаревич
EPmUxG5PxXQ	Зубаревич на профит конф
FQMZ9idVy70	«Экономика сдохнет»? Зубаревич о росте НДС, дефиците бензина, угольном кризисе и военных расходах
bUj7skVNjGM	Зубаревич/ Грэм/ Экономика, векторы, итоги. Наталья Зубаревич  @i_gryanul_grem Описание 
fMMIVPx0g94	Зубаревич о рецессии в России: почему беднеют регионы и сжимается бизнес
McpCBXnHYqM	Is Zubarevich stuck in a commodities-based model? My response to the "2026 will be worse than 202...
X1sdaI8MPbc	IN DEFENSE OF PROFESSOR ZUBAREVICH
3WasA_0j7hs	Наталья Зубаревич «Без посредников» + "Корнет! Вы - женщина?" "Не так" с Бунтманом и Кузнецовым
ujb2XMNMpnk	Natalia Zubarevich: The Economy of Russian Industries and Regions | Kotomodern is Watching
Uxa-Qskzi3c	Наталья Зубаревич. Можно ли спасти моногорода (28 апреля 2011 г.)
hS0ll5aJ_eg	Наталья Зубаревич. В кризисе каждый будет выкручиваться как может. (2015 г.)
OXifDtt0HZA	Изгнание мигрантов. Гонка зарплат. Рубль после теракта / Зубаревич
D4A8HSUtvv4	Инфляция у всех своя, как и зарплата. Наталья Зубаревич о том, что происходит с экономикой России
qmn4I8BNwTQ	Как будем жить дальше? Инфляция, зарплаты, рубль. Зубаревич, Липсиц, Алексашенко, Буклемишев, Нечаев
lcIM06sXoC4	Natalia Zubarevich. 2024 / 10/25/24
1YTweUVg1No	💥Наталия Зубаревич: Что происходит с экономикой России сейчас и что будет после войны!?
DvFdyiQBPN4	Почему Башкортостан отстаёт от Татарстана? Разбор экономики регионов с Натальей Зубаревич
6isJS229b0A	Наталья Зубаревич о российской экономике | Новогодний марафон 7x7
8JrtHhjGCyc	«Народ будет терпеть». Цены на лекарства и бензин, курс рубля, инфляция и налоги / Зубаревич
hiBn9aIrjX4	ЗУБАРЕВИЧ: что с ВВП, чего ждать после "перемирия", как в бизнесе, Трамп, новые ЦИФРЫ ПО РЕГИОНАМ
tBM7dCZ_aJU	«Невероятная живучесть»: Наталья Зубаревич о состоянии российской экономики, бизнесе и санкциях
tBrIFprGbO8	Зубаревич & Жаиков - Точки роста экономики, цифровизация, Астана и Алматы в "шоколаде"| SOZ APT
lESEnrJXsng	Тольяттинские диалоги_1 секция_лекция Н. Зубаревич
jvkLXxC0-y8	Наталья Зубаревич о реальной инфляции, демографии регионов, безработице, авторынке и мигрантах
yadN7sEMhoE	Наталья Зубаревич о том, как экономика России справляется с войной
zFzFn2g7TRM	За счет чего финансируются боевые действия? Инфляция, рост цен, зарплаты / Зубаревич
fbLGUIir964	Наталья Зубаревич: Неравенство было, есть и будет
Y738LAk4QqQ	Наталья Зубаревич.Последние статистические данные. Рост промышленности, падение нефтянки
EJJ1Sh6XCKY	Наталья Зубаревич. Регионы России в новых экономических условиях
vipsPvidF7c	Наталья Зубаревич о российской экономике спустя 2,5 года санкций / Редакция. Интервью
2X9CfxiBBbU	Наталья Зубаревич и Максим Курников | Интервью BILD
c7-W4VpuaUM	Наталья Зубаревич о «перегреве» экономики, нефтегазовых доходах, рынке недвижимости и росте зарплат
4RkBGzp2GJ8	Замедление экономики. Продовольственная инфляция. Ключевая ставка ЦБ / Зубаревич: Без посредников
WKm4zIHoO7c	«Хвалиться нечем»: экономические итоги 2024 года и прогнозы на 2025 / Зубаревич, Вьюгин, Ениколопов
tCyxUG4Du9o	Наталья Зубаревич и Максим Курников | Интервью BILD
Tl8oqdY3-lM	Наталья Зубаревич: Особое мнение / 11.07.24
MmBm0_C5204	Kazakhstans Risks and Prospects: Economist Natalia Zubarevichs Opinion
rFXw5vCsl18	Состояние российской экономики и ущерб от ударов дронов по НПЗ - Наталья Зубаревич
Mo5w8NLY9sI	Отрезвляющий разговор об экономике России. Что случится после перемирия? Наталья Зубаревич
RhPpwlnt6nc	Natalia Zubarevich on the Present and Future of the Russian Economy, Favorite Books, and Moscow S...
4-tybtpydaM	Наталья Зубаревич. Лекция «Регионы России в новых экономических условиях»
KKZzEAJVvG0	Страна, которую мы не представляем. Наталья Зубаревич о выживании, бедности и адаптации к худшему
tsudNZ5UCg8	«Катастрофы не произойдет. Будет медленное ухудшение» / Наталья Зубаревич // Вы держитесь
5BxBd2E0hI0	Зубаревич: Россия еще долго может финансировать войну
jdERda6xiDA	Наталья Зубаревич. Когда закончится экономическая турбулентность? Как кризисы переплетаются?
_amY94mGAdU	Natalia Zubarevich / 2023 // 17.03.2023
GatvTHtVMxI	Сельское хозяйство / Импортозамещение / Шестидневка / Наталья Зубаревич / Особое мнение / 22.05.2023
fH572fq5uMI	«Аспекты мнений» / Наталья Зубаревич // 16.02.23
7t0qbXgZKS0	Natalia Zubarevich on the new crisis in Russia, the occupation of Ukraine, and life in the region...
sieRmM3ymB0	Зубаревич: Отток мозгов — удар по экономике России, и это  — надолго
-ANlqUZ8gYE	Наталья Зубаревич страшная правда про про Санкции и российский бизнес
dAM-FxVARmY	Population Decline / Budget Deficit / The Future of Industry / Zubarevich / Dissenting Opinion //...
V8MJ_Vdcwa8	⭕️ Что происходит с российской экономикой? - Интервью с Натальей Зубаревич
-Pm3oZ5yo5M	Зубаревич: "Я скажу одно – это бешеные деньги". О комплексах, цене на яйца, нефть, авто, ЧТО ДАЛЬШЕ?
946cl2RuZBM	«Последствия будут, пока страна не поймет ценность жизни»: Наталья Зубаревич
4XsMiVRI2-k	Как российская экономика пережила 2023год? Отвечает Наталья Зубаревич.
H9ktek2wqZE	Наталья Зубаревич. Четыре России
2CjHh2xmR8I	Наталья Зубаревич: итоги 2022 и прогнозы на 2023 год / влияние мобилизации / кризис в регионах
qSRQ7_aDf5k	Наталья Зубаревич: Адаптация к санкциям происходит довольно быстро // 01.03.2023
tKEo8L4QzEA	Наталья Зубаревич о том, что происходит с российской экономикой / Редакция. Интервью
CzhBoodl2Rk	ЗУБАРЕВИЧ: "Буду вас расстраивать". Что в РФ, как дальше, регионы, цифры, ВВП, топливный кризис
_CYvC3uqUSk	Наталья Зубаревич про топливный кризис, инфляцию, трудовую миграцию и борьбу с "уехавшими"
VAtcfBi11H4	Ватникам смотреть не надо - Наталья Зубаревич о том, что будет
gNFTvDHdrRQ	Наталья Зубаревич о региональных бюджетах: дефицит, долги и ручное управление
CC9L789HiIw	Наталья Зубаревич и Максим Курников | Интервью BILD
K49txpdZx3I	Как экономика России пережила санкции. Зубаревич: Утренний разворот / 03.12.23
90ZZG5lCMx8	Наталья Зубаревич. Что с экономикой России? Обсуждаем последние данные Минфина.
1gLz9mS-NFc	«Аспекты мнений» / Наталья Зубаревич // 06.09.24
GnfGTn4pAiw	Кризисы в современной России | Наталья Зубаревич | КонцептХаб
yyjqEL2Ee_c	💥 Итоги 2022 года! Зубаревич, Мовчан, Белковский! Что произошло с российской экономикой? | Зубаревич
UOxcUSvPRno	Изолированная Россия: рецессия в регионах. Разговор с Натальей Зубаревич
lQj7ZFdJRhY	Economic Crisis - 2022 / Zubarevich
8llSz9e3Frw	Наталия Зубаревич: Как будут выживать в России под санкциями и когда экономика нащупает дно
zu9X2ZAHqTU	Зубаревич — экономика и демография регионов России 🇷🇺 в условиях войны с Украиной
yV-1dmS5LQo	Наталья Зубаревич: «Атипичный кризис-2022. Как он сказался на регионах» /Подкаст «Экономика на слух»
dNjPnUWvVoQ	Цена войны в Украине для экономики России / Наталья Зубаревич
xIT1svwWCSs	Наталья Зубаревич: Технологическое отставание и утечка мозгов!
11HExBVpccs	НАТАЛЬЯ ЗУБАРЕВИЧ. Для падения экономики 2022-й год не финальный.
k9E9atuETkc	Наталья Зубаревич - жизнь станет намного хуже
22Ro1NauvmU	Наталья Зубаревич - ECЛИ HAPOД У3HAET, БУДET БУHT! УЧEHЫE B ПAHИKE
KFscNmRT7Hg	НАТАЛЬЯ ЗУБАРЕВИЧ. Санкции введены на оборудование для большого количества отраслей.
TsjO8Vnqswo	НАТАЛЬЯ ЗУБАРЕВИЧ. Инфляция. Дефициты. Сжатие спроса. Падение ВВП. Статистика за апрель-май 2022 г.
A_glXKV2Esk	НАТАЛЬЯ ЗУБАРЕВИЧ. Всё когда-то заканчивается, мы переживем и это. Но ущербы чудовищные.
ZQBtJPOOg5Y	Наталья Зубаревич в программе «ДИАЛОГИ О ДОРОГАХ» | Угольные регионы. Социально-экономический разрез
wUvb1X0Lqsk	Наталья Зубаревич – про экономику Югры, проблемы нефтяников и загадки статистики
ruHrqxS3F_k	Лекция Натальи Зубаревич: «Территориальное неравенство в современной России»
N9i1m5VBV6Q	Зубаревич Н. В. - Современные тенденции регионального развития - 1. О трансформациях в России
Cwn1eDS7amM	Может ли вся страна жить как москвичи Наталья Зубаревич. С нормализованным звуком
fZG11lSo4gk	Natalia Zubarevich Lecture: How Does Regional Inequality Work?
QDYgw855PJA	"MOSCOW IS NOT RUSSIA". Zubarevich, Semikhatov, Surdin
J2orQZ03KLw	Профессор Наталья Зубаревич. Лекция для студентов ВлГУ
k2tTKnwSPjw	Zubarevich N.V. - Modern Trends of Regional Development - 5. Industry Markets. Part 2
ToQspnMUazs	N. V. Zubarevich ("Opportunities and Risks of Decentralization: Economic and Institutional Factors")
ilIsAVrmy0U	Наталья Зубаревич Региональное неравенство в России мифы и реалии
0n_PXXpsIvA	Экономические последствия коронакризиса для регионов России и Самарской области - Н.В.Зубаревич
s_dzE2oksWc	Лекция Натальи Зубаревич. Кризис в России: региональная проекция (2016г.)
0Q96w17Plk4	NATALIA ZUBAREVICH
xyAyVSiIcwA	Natalya Zubarevich: Protests in the regions, Navalnys poisoning, the price of quarantine || Scal...
oyrKKcZSY-Q	Наталья Зубаревич. Лекция «Москва... как много в этом звуке...» (20 октября 2011г.)
MiBpZec-KbU	Лекция Натальи Зубаревич. Новая реальность, как она влияет на развитие и бюджеты регионов? (2015г.)
u_PmOOtkMFo	Лекция Натальи Зубаревич. Развитие крупных городов России. С креативного неба на землю. (2014г.)
9ijrbsDZD0Y	Наталья Зубаревич "Региональное неравенство в России: мифы и реалии"
rilw0LsSkc8	Наталья Зубаревич в проекте «Лекции в Политехническом» id78441
tbK6-Q9x77w	АКТУАЛЬНОЕ ИНТЕРВЬЮ. Наталья Зубаревич
6ckQzAUTqZQ	Natalia Zubarevichs emotional interview: "Do you think everyones going to croak?" // And Then C...
z0pWnjDsRFs	Особое мнение / Наталья Зубаревич // 04.08.20
_doSjv_z9xI	«Очень не люблю двуличие» — Наталья Зубаревич об экономике и фатализме
iPdc4cXslM8	ЗУБАРЕВИЧ: "Сразу дам всем совет". Что в регионах, где присмотреться, экономика 2025, ВПК, дно?
7GmXJCfsPwI	BREAKTHROUGH or COLLAPSES? Analysis by Zubarevich
SVhvhuFR4_Q	Грэм: что с резиденцией Путина, Иран, Буданов, 2026– Зубаревич, Крутихин, Романова
rqRXUxnbAuM	ЗУБАРЕВИЧ: почему Хуснуллин в печали, что с экономикой в оборонных регионах РФ, как в Чечне,кто жив?
oV4gdRrf6oM	Наталья Зубаревич об окружении Путина, Газпроме, Чечне, Крыме, Калининграде и РФ через 10 лет
nbAMqZThN0Q	ЗУБАРЕВИЧ:"Cлучилась беда, вот что нужно знать": ВПК, водка, ЦИФРЫ, нефть, ГАЗПРОМ. БОЛЬШОЕ ИНТЕРВЬЮ
7GOFC9c1RTc	Наталия Зубаревич - Тотальная бедность. Больше половины дохода на еду
IVCAyOS5i70	Грэм: Змеиный остров, Лавров и Лукашенко, куда стремится Путин - Зубаревич и Ларина
3-EKdgVr94c	RUSSIAN ECONOMY/ Incomes have stagnated, the “commodity needle” remains // Natalia ZUBAREVICH
LzfucFm1D_s	Зубаревич, Фейгин, Галлямов: Что (не) закончилось у Путина?
feFFXHsdfNM	Грэм: что происходит? - Зубаревич, Портников, Шейтельман
IvPZzmlqJvg	Грэм: 9 мая. Красная площадь, фронт, отчаяние Пригожина - Тарас Березовец, Наталья Зубаревич
x-AGiAc_KD8	ЗУБАРЕВИЧ. Элементы управленческого маразма с вишенкой на торте! 26.11.20
bU8i-D2QmqA	ЗУБАРЕВИЧ: "Вы можете в это поверить? Я - нет": что с Газпромом, где Роснефть, Чечня, ВПК и водка
wkXW3mwe0gA	Зубаревич: "Я скажу страшную вещь". О регионах РФ, нефти в Сибири, Чечне и границе с Украиной
egZnQGcuDqk	ГрэмNews: кто подставит Путина, тайна Пиотровского, Гоголь-центр - Зубаревич, Троицкий,  Яковенко
jKO7dhZLWr4	Липсиц об обвинении Зубаревич, прогнозах Потапенко, тезисе Крутихина, крахе "Газпрома"нефти, долларе
T-_7r1Y2HOA	ГрэмNews: что свершилось у Арестовича, кого напророчил Соловей, Зубаревич в шоке, Портников о КОНЦЕ
9eyad3LRoQ8	Зубаревич/ Утренний Разворот/ Наталья Зубаревич  @zhivoygvozd Описание 
aG1DbNybI_k	Грэм: Леонтьев уходит, Путин "приходит",  Убойная сила,  НПЗ в огне - Зубаревич, Барабанов, Макейчик
FiA295Ybbpw	Алексашенко о прогнозе Пастухова, куда исчез олигарх Прохоров, Гуриеве, Зубаревич и Набиуллиной
YKZSXLiULUU	Гуриев, Зубаревич, Новиков, Фейгин:  что ждет Лукашенко и Путина в Гааге и где искать правду?
FHH8ij2MK9A	Грэм: Путин, Вагнер, Гаага, регионы, экономика — Осечкин, Блох, Зубаревич
aDZeOclppFg	Грэм: чем обернется ультиматум Трампа, когда "проснется" Путин, ЖИТЬ.. - Зубаревич, Колесников
txCwuRDf_ak	«2017» Наталья Зубаревич 29.09.2017
xjk0qMEcyXc	КАТАСТРОФА или пока только БЕДА? Наталья Зубаревич
jsyO3LUjpfg	ZUBAREVICH. In Russia, good things are either short or have a downside 12/24/20
_tjZJjulSJo	Региональное неравенство в России: масштабы, динамика, возможности смягчения | Наталья Зубаревич
wkPoSZb35cg	Natalia Zubarevich on regional and social inequality. Personal Take #98
AHh3Etx1tTc	Everything for Moscow, leftovers for the regions? A lecture by Natalia Zubarevich
2S2ncBSVFQk	Наталья Зубаревич о нищем бюджете Поморья| 29.RU
YmRhD5tcsY8	Наталья Зубаревич
g_9sbm6O7W0	Зубаревич Наталья. России полный капец!
cdmN_c7VG-I	Профессор Зубаревич о регионах РФ
ul0SolwaaOg	Наталья Зубаревич: прессинг губернаторов, коронакризис и кто одолеет Роснефть?
jDkYPAFoVc8	Интервью экономиста Натальи Зубаревич
Hpipyqs3-ZY	Natalia Zubarevich, regional expert on the Sverdlovsk region
xLlTMByxaSI	Крах экономики в регионах России-Наталья Зубаревич
s4OO-vkIvOw	Зубаревич Н  В    Современные тенденции регионального развития   О трансформациях в РоссииNormalLeve
fqlHq8_EzIM	«Потапенко будит!»/Наталья Зубаревич. Демографический обрыв
b5rRTd44BiQ	Наталья Зубаревич  "Развитие крупных городов Сибири и Дальнего Востока в 2010-х годах"
FXrfHOtfJTs	How can Siberia survive without taxes? Natalia Zubarevich on the tricks of the big guys and the f...
rA_ORhh74Xw	Наталья Зубаревич. «Воронеж и другие крупные города» (10 янв. 2013 г.)
9E2cmFuptxI	Наталья Зубаревич: Наше отставание неизбежно
CVRyi51-W8A	Когда Москва сожрет Россию? Отвечает Наталья Зубаревич // Центральный вайб
XjWwf9o5z_o	Котомодерн смотрит "МОСКВА - НЕ РОССИЯ". Зубаревич, Семихатов, Сурдин
OaboBF8Ivf8	КОТОМОДЕРН СМОТРИТ: "МОСКВА - НЕ РОССИЯ". Зубаревич, Семихатов, Сурдин // Вселенная Плюс
y6g7LK0YxHo	Наталья Зубаревич, профессор кафедры экономической и соц. географии географического факультета МГУ
SkzDZmcbTQs	«Кризис имени рыжего дяденьки» / Зубаревич про экономику России и цены на квартиры: обвала не будет?
u-w397EOBWM	«Социальная дифференциация российского пространства», Н. Зубаревич
-R6B1GWojG4	The Russian field of experiments: Zubarevich, Auzan, Revzin #eshenepozner
nb01jn8Rmfo	КОЧЕВНИК СМОТРИТ:  "МОСКВА - НЕ РОССИЯ". Зубаревич, Семихатов, Сурдин
dkEMcHJJhKY	The Country We Dont Imagine. Natalia Zubarevich on Survival, Poverty, and Adapting to the Worst
1Z20rj87Amw	Мрачные перспективы для беднейшей части населения…Чего ждать и что делать… Советы Натальи Зубаревич…
700vqQv2nAM	Наталья Зубаревич объясняет ситуацию с бедностью в стране / 15.02.2019
Su8WLtIjqnE	Наталья Зубаревич: На пенсионеров и бюджетников денег хватит, какой выход у остальных?
muXDXVpOpYU	Наталья Зубаревич - Рост бедности в России / Федеральный, региональные бюджеты / Регулирование цен
PQlvwHU__ME	ДЕВАЛЬВАЦИЯ, БЕЗРАБОТИЦА, ОБЕДНЕНИЕ. Наталья Зубаревич о будущем российской экономики
dPpQ5g79h_g	Наталья Зубаревич - Существуют четыре России...
H34RztE8hjU	Наталья Зубаревич. Социальное пространство: четыре России. (29 июля 2012 г.)
fwLB-CB4Fw0	Наталья Зубаревич. Кризисы в России, территориальная проекция (2014г.)
KMQnbgUdTjs	 ИВГПУ|Наталья Зубаревич. Развитие регионов России: долгосрочные тренды и влияние пандемии (Иваново)
LylJ_KyZe7Q	Наталья Зубаревич. Есть ли в России внятная региональная политика? (14 октября 2011 г.)
KIgn9lqmrVg	Зубаревич Н. В. - Современные тенденции регионального развития - 8. Демографические проблемы
_RY8eBgn8_M	Наталья Зубаревич. О российской экономике после коронавируса, проблемах близкого будущего и Росстате
-uwiXIwmI14	Natalia Zubarevich: How stagnation will hit the provinces.
CxLsGuBqvSQ	Наталья Зубаревич Россия: что происходит?
yajKxaz7tJg	Что будет с рынком труда в регионах России? Отвечает Наталья Зубаревич
SAHnto7bg80	Стрим «Вёрстки». Угрозы и риски в России. Отвечают эксперты: Зубаревич, Кваша, Захватов, Кванталиани
upvkecjDr8A	Наталья Зубаревич о реформе местного самоуправления
Eb1V835QK7g	Online Conversation with Natalia Zubarevich (2013)
Z6rwxE6ZAzE	Natalia Zubarevich about socio-economic development of Tatarstan and other Russian regions
LISTEOF

total=$(grep -c . "$OUT/list.tsv")
n=0; ok=0
while IFS=$'\t' read -r id title; do
  [ -z "$id" ] && continue
  n=$((n+1))
  if ls "$OUT/vtt/$id".*vtt >/dev/null 2>&1; then ok=$((ok+1)); continue; fi
  echo "[$n/$total] $title"
  "$YTDLP" ${EXTRA[@]+"${EXTRA[@]}"} -q --no-warnings --skip-download --ignore-no-formats-error \
    --write-subs --write-auto-subs --sub-langs "ru,ru-orig,ru.*" --sub-format vtt \
    --write-info-json -o "$OUT/vtt/%(id)s.%(ext)s" "https://www.youtube.com/watch?v=$id" < /dev/null \
    && ls "$OUT/vtt/$id".*vtt >/dev/null 2>&1 && ok=$((ok+1)) || echo "   нет русских субтитров или ошибка"
  sleep 4
done < "$OUT/list.tsv"

echo "Конвертирую субтитры в текст..."
"$VENV/bin/python" - "$OUT" <<'PYEOF'
import sys, os, re, json, glob
out = sys.argv[1]
for vtt in sorted(glob.glob(os.path.join(out, "vtt", "*.vtt"))):
    vid = os.path.basename(vtt).split(".")[0]
    meta = {}
    ij = os.path.join(out, "vtt", vid + ".info.json")
    if os.path.exists(ij):
        try: meta = json.load(open(ij, encoding="utf-8"))
        except Exception: pass
    lines, prev = [], ""
    for line in open(vtt, encoding="utf-8", errors="ignore"):
        line = line.strip()
        if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")) or line.isdigit():
            continue
        line = re.sub(r"<[^>]+>", "", line).strip()
        if line and line != prev and not (prev and prev.endswith(line)):
            lines.append(line); prev = line
    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text)
    hdr = (f"# {meta.get('title','')}\nКанал: {meta.get('channel','')}\nДата: {meta.get('upload_date','')}\n"
           f"Длительность, мин: {int((meta.get('duration') or 0)//60)}\nURL: https://www.youtube.com/watch?v={vid}\n\n")
    open(os.path.join(out, "txt", f"{meta.get('upload_date','00000000')}_{vid}.txt"), "w", encoding="utf-8").write(hdr + text + "\n")
print("готово:", len(glob.glob(os.path.join(out, "txt", "*.txt"))), "текстов")
PYEOF

cd "$HOME/Downloads" && rm -f zubarevich_youtube.zip && zip -qr zubarevich_youtube.zip zubarevich_youtube/txt
echo
echo "Скачано субтитров: $ok из $total"
echo "Тексты: $OUT/txt"
echo "Архив для отправки: $HOME/Downloads/zubarevich_youtube.zip"
