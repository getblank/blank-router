package internet

import (
	"net/http"

	"golang.org/x/net/websocket"

	"github.com/getblank/blank-router/taskq"
	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
	"github.com/labstack/echo/middleware"
)

var commonSettings = `{"_commonSettings":{"entries":{"baseUrl":"http://localhost:3001","defaultLocale":"ru","lessVars":{"@baseColor":"#3C8DBC"},"links":[{"href":"http://mysite.com/example","rel":"canonical"}],"locales":["ru"],"meta":[{"content":"Application description","name":"description"},{"content":"Application author","name":"author"}],"resetPasswordProps":{"password":{"display":"password","formOrder":2,"groupAccess":"ru","label":"{{$i18n.$settings.resetPassword.newPassword}}","required":true,"type":"string"}},"resetPasswordRequestProps":{"email":{"display":"textInput","groupAccess":"ru","label":"Email","pattern":"^\\S+@\\S+\\.\\S+$","patternError":"{{$i18n.$settings.signUp.invalidEmail}}","required":true,"type":"string"}},"signInProps":{"login":{"display":"textInput","formOrder":1,"groupAccess":"ru","label":"{{$i18n.$settings.common.email}}","required":true,"type":"string"},"password":{"display":"password","formOrder":2,"groupAccess":"ru","label":"{{$i18n.$settings.common.password}}","required":true,"type":"string"}},"signUpProps":{"email":{"display":"newUsernameInput","formOrder":1,"groupAccess":"ru","label":"{{$i18n.$settings.common.email}}","pattern":"^\\S+@\\S+\\.\\S+$","patternError":"{{$i18n.$settings.signUp.invalidEmail}}","required":true,"type":"string"},"eula":{"display":"checkbox","formOrder":4,"groupAccess":"ru","label":"Я согласен с условиями \u003ca href=\"http://www.ru\" target=\"_blank\"\u003eсоглашения\u003c/a\u003e","required":true,"type":"bool"},"password":{"display":"password","formOrder":2,"groupAccess":"ru","label":"{{$i18n.$settings.common.password}}","required":true,"type":"string"}},"title":"Callback POWER","titleHref":"http://cbp.kz","titleTarget":"_blank","userActivation":true},"i18n":{"cb":{"address":"Адрес","config":"Конфигурация","date":"Дата","friday":"Пятница","holidays":"Выходные","monday":"Понедельник","phone":"Телефон","phoneNumber":"Номер телефона","saturday":"Суббота","store":"Магазин","sunday":"Воскресенье","thursday":"Четверг","tuesday":"Вторник","wednesday":"Среда","widget":"Виджет","widgets":"Виджеты","workdays":"Будни"},"comments":{"label":"Комментарии","placeholder":"Написать..."},"common":{"actionError":"Что-то пошло не так: ","apply":"Применить","cancel":"Отменить","datePattern":"ДД.ММ.ГГГГ","email":"Адрес электронной почты","language":"Язык","loadingData":"загрузка данных","month":"Месяц","password":"Пароль","recordsOnPage":"Строк на странице: ","saved":"изменения сохранены","today":"Сегодня","userName":"Имя пользователя","week":"Неделя","yesterday":"Вчера"},"errors":{"EMAIL_NOT_FOUND":"E-mail адрес не найден","INVALID_OLD_PASSWORD":"Старый пароль не правильный","PASSWORD_NOT_MATCHED":"Неверный пароль","action":"Очень жаль, но мы не смогли выполнить ваш запрос","common":"Ой, что-то пошло не так...","delete":"Ошибка при удалении","emailInvalid":"Некорректный e-mail","emailUsed":"E-mail занят","invalidPattern":"Неверный формат","requiredField":"Обязательное поле","save":"Ошибка при сохранении изменений"},"filters":{"all":"Все","clear":"Сбросить","enterSearchText":"Поиск","search":"Поиск","title":"Фильтр"},"form":{"addToObjectList":"Добавить","all":"Все","cancel":"Отменить изменения","delete":"Удалить","deleted":"Объект удален","e404":"Ой, а такого объекта у нас нет...","e404prompt":"Можно выбрать что-нибудь другое из списка или добавить новую запись","emptyPreview":"Выберите объект для отображения...","filterNotMatch":"Выбранный объект не попадает под условия фильтра","newObject":"Новый объект","notSaved":"Не сохранено:","save":"Сохранить","selected":"Выбранные"},"install":{"accept":"Принять","createRoot":"Создание аккаунта администратора","hello":"Привет. Скоро начнем.","license":"Лицензионное соглашение","next":"Далее"},"lists":{"empty":"Похоже, тут ничего нет...","notFound":"Ничего не найдено"},"notifications":{"empty":"Уведомлений нет","previously":"Ранее"},"profile":{"changeLogin":"Изменение логина","link":"Профиль","newLogin":"Новый логин","passwordSaved":"Пароль изменен","saved":"Данные профиля сохранены","title":"Профиль"},"resetPassword":{"action":"Сменить пароль","newPassword":"Новый пароль","oldPassword":"Текущий пароль","successEmailSubject":"Пароль успешно изменён","title":"Изменение пароля"},"sendResetLink":{"action":"Отправить ссылку","emailSubject":"Восстановление пароля","link":"Я забыл пароль","title":"Восстановление пароля"},"signIn":{"action":"Войти","error":"Неверное имя пользователя или пароль","restoreLinkSent":"Письмо со ссылкой для сброса пароля отправлено. Если был указан корректный адрес, вы получите письмо в течение 10 минут","title":"Вход"},"signOut":{"action":"Выйти"},"signUp":{"action":"Зарегистрироваться","activationEmailSubject":"Активация аккаунта","eulaCheck":"Я принимаю условия лицензионного соглашения","invalidEmail":"Неправильный адрес email","loginInUse":"E-mail занят","registrationSuccessEmailSubject":"Поздравляем с регистрацией","subscribeCheck":"Я согласен получать рассылку","success":"Регистрация прошла успешно. Вы можете войти, используя свои e-mail и пароль.","successNeedActivation":"На указанный вами адрес отправлено письмо для активации аккаунта.","title":"Регистрация"}}}}
`

func init() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	wamp := wampInit()
	e.GET("/wamp", standard.WrapHandler(websocket.Handler(func(ws *websocket.Conn) {
		wamp.WampHandler(ws, nil)
	})))

	e.File("/", "static/html/index.html")
	e.File("/app.css", "static/css/app.css")

	e.Static("/fonts", "static/fonts")
	e.Static("/css", "static/css")
	e.Static("/js", "static/js")

	e.Get("/common-settings", commonSettingsHandler)

	go e.Run(standard.New(":8080"))
}

func commonSettingsHandler(c echo.Context) error {
	t := taskq.Task{
		Type:   taskq.CommonSettings,
		UserID: "222222-2222-2222-2222-222222222222",
		Store:  "users",
		Arguments: map[string]interface{}{
			"lang": "ru",
		},
	}
	resChan := taskq.Push(t)

	res := <-resChan
	if res.Err != "" {
		return c.JSON(http.StatusNotFound, res.Err)
	}
	return c.JSON(http.StatusOK, res.Result)
}
