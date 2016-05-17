package taskq

import (
	"sync"

	log "github.com/Sirupsen/logrus"
)

const (
	mainQueueLength  = 1000
	extraQueueLength = 1000
)

const (
	DbGet           = "dbGet"
	DbSet           = "dbSet"
	DbDelete        = "dbDelete"
	DbFind          = "dbFind"
	Auth            = "authentication"
	CommonSettings  = "commonSettings"
	DbAction        = "action"
	HTTPHook        = "httpHook"
	ScheduledScript = "scheduledScript"
)

var (
	mainQueue  chan Task
	extraQueue chan Task
	shiftQueue chan Task

	resultChans  map[int]chan Result
	resultLocker sync.Mutex

	sequence       int
	sequenceLocker sync.Mutex
)

// Result is a struct for result of task
type Result struct {
	ID     int
	Result interface{}
	Err    string
}

// Task represents task for workers
type Task struct {
	ID        int                    `json:"id"`
	Store     string                 `json:"store"`
	UserID    string                 `json:"userId"`
	Type      string                 `json:"type"`
	Arguments map[string]interface{} `json:"args"`
}

// Done must be called when task is done
func Done(r Result) {
	log.WithFields(log.Fields{"id": r.ID}).Debug("Task is done")

	resultLocker.Lock()
	ch, ok := resultChans[r.ID]
	delete(resultChans, r.ID)
	resultLocker.Unlock()
	if !ok {
		log.WithField("id", r.ID).Warn("Result channel was not found")
		return
	}
	ch <- r
}

// Push ads new task to a queue with assigning new ID
func Push(t Task) chan Result {
	t.ID = nextID()
	ch := make(chan Result)
	resultLocker.Lock()
	resultChans[t.ID] = ch
	resultLocker.Unlock()
	mainQueue <- t
	return ch
}

// Shift returns task from the queue
func Shift() Task {
	t := <-shiftQueue
	return t
}

// UnShift returns task to the queue
func UnShift(t Task) {
	extraQueue <- t
}

func nextID() int {
	sequenceLocker.Lock()
	sequence++
	sequenceLocker.Unlock()
	return sequence
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
	resultChans = make(map[int]chan Result)

	go queuing()
}
