package taskq

const (
	DbGet           = "dbGet"
	DbSet           = "dbSet"
	DbDelete        = "dbDelete"
	DbFind          = "dbFind"
	DbAction        = "action"
	HTTPHook        = "httpHook"
	ScheduledScript = "scheduledScript"

	mainQueueLength  = 1000
	extraQueueLength = 1000
)

var (
	mainQueue  chan Task
	extraQueue chan Task
	shiftQueue chan Task
)

// Task ...
type Task struct {
	ID        string                 `json:"_id"`
	Store     string                 `json:"store"`
	UserID    string                 `json:"userId"`
	Type      string                 `json:"type"`
	Arguments map[string]interface{} `json:"arguments"`
}

func Push(t Task) {
	mainQueue <- t
}

func Shift() Task {
	t := <-shiftQueue
	return t
}

func UnShift(t Task) {
	extraQueue <- t
}

func queuing() {
	for {
		select {
		case t := <-extraQueue:
			shiftQueue <- t
		case t := <-mainQueue:
			shiftQueue <- t
		}
	}
}

func init() {
	mainQueue = make(chan Task, mainQueueLength)
	extraQueue = make(chan Task, extraQueueLength)
	shiftQueue = make(chan Task)

	go queuing()
}
