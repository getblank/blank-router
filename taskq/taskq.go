package taskq

import (
	"sync"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/pkg/errors"
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
	DbLoadRefs      = "dbLoadRefs"
	DbPush          = "dbPush"
	Auth            = "authentication"
	UserConfig      = "userConfig"
	DbAction        = "action"
	HTTPHook        = "httpHook"
	ScheduledScript = "scheduledScript"
	StoreLifeCycle  = "storeLifeCycle"
)

var (
	mainQueue  chan Task
	extraQueue chan Task
	shiftQueue chan Task

	resultChans  map[int]chan Result
	resultLocker sync.Mutex

	sequence       int
	sequenceLocker sync.Mutex

	errTimeout = errors.New("Timeout")
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
	UserID    string                 `json:"userId"`
	Store     string                 `json:"store"`
	Type      string                 `json:"type"`
	Arguments map[string]interface{} `json:"args"`
	rotten    *bool
}

// Done must be called when task is done
func Done(r Result) {
	log.WithFields(log.Fields{"id": r.ID, "error": r.Err}).Debug("Task is done")
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
	log.WithFields(log.Fields{"id": t.ID, "type": t.Type, "store": t.Store, "userId": t.UserID}).Debug("New task pushed")
	return ch
}

// PushAndGetResult is the alternative way to push task. It returns result and error instead of channel
// Second argument is a task timeout. If provided, when timeout reached and task will not completed yet,
// error returns with nil result
func PushAndGetResult(t Task, timeout time.Duration) (interface{}, error) {
	var rotten bool
	t.rotten = &rotten
	resChan := Push(t)
	if timeout == 0 {
		res := <-resChan
		if res.Err != "" {
			return nil, errors.New(res.Err)
		}
		return res.Result, nil
	}

	timer := time.NewTimer(timeout)
	select {
	case <-timer.C:
		rotten = true
		return nil, errTimeout
	case res := <-resChan:
		if res.Err != "" {
			return nil, errors.New(res.Err)
		}
		return res.Result, nil
	}
}

// Shift returns task from the queue
func Shift() Task {
	t := <-shiftQueue
	log.WithFields(log.Fields{"id": t.ID}).Debug("Put task from queue")
	return t
}

// UnShift returns task to the queue
func UnShift(t Task) {
	log.WithFields(log.Fields{"id": t.ID}).Debug("Return task to the queue")
	if t.rotten != nil && *(t.rotten) {
		return
	}
	log.WithFields(log.Fields{"id": t.ID}).Debug("Task returned to the queue")
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
		// This is for rising extraQueue priority
		select {
		case t := <-extraQueue:
			shiftQueue <- t
		default:
		}

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
