## In this laboratory work I have to craete a file system, which can do such commands

mkfs n – ініціалізувати ФС, n – це кількість дескрипторів файлів (ця команда не потрібна
для ФС для пам’яті).
• stat name – вивести інформацію про файл (дані дескриптору файлу).
• ls – вивести список жорстких посилань на файли з номерами дескрипторів файлів в
директорії.
• create name – створити звичайний файл та створити на нього жорстке посилання з ім’ям
name у директорії.
• fd = open name – відкрити звичайний файл, на який вказує жорстке посилання з ім’ям
name. Команда повинна призначити найменше вільне невід’ємне цілочисельне значення
(назвемо його числовий дескриптор файлу) для роботи з відкритим файлом (це число – це
не те саме, що номер дескриптору файлу у ФС). Один файл може бути відкритий кілька
разів. Кількість числових дескрипторів файлів може бути обмежена.
• close fd – закрити раніше відкритий файл з числовим дескриптором файлу fd, значення
fd стає вільним.
• seek fd offset – вказати зміщення для відкритого файлу, де почнеться наступне читання
або запис (далі «зміщення»). При відкритті файлу зміщення дорівнює нулю. Це зміщення
вказується тільки для цього fd.
• read fd size – прочитати size байт даних з відкритого файлу, до значення зміщення
додається size.
• write fd size – записати size байт даних у відкритий файл, до значення зміщення
додається size.
• link name1 name2 – створити жорстке посилання з ім’ям name2 на файл, на який вказує
жорстке посилання з ім’ям name1.
• unlink name – знищити жорстке посилання з ім’ям name.

• truncate name size – змінити розмір файлу, на який вказує жорстке посилання з ім’ям
name. Якщо розмір файлу збільшується, тоді неініціалізовані дані дорівнюють нулям.
