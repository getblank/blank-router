package taskq

import (
	"testing"
	"time"

	"github.com/franela/goblin"
)

func TestPushing(t *testing.T) {
	g := goblin.Goblin(t)
	g.Describe("#PushAndGetResult", func() {
		g.It("should push task to the queue and return error when timeout reached", func() {
			t := Task{
				Type: "TEST",
			}
			now := time.Now()
			res, err := PushAndGetResult(t, time.Second)
			g.Assert(res).Equal(nil)
			g.Assert(err).Equal(errTimeout)
			dur := time.Now().Sub(now)
			g.Assert(time.Second <= dur && dur < time.Millisecond*1100).IsTrue()
		})
		g.It("should not unshift task to the queue when timeout reached", func() {
			t := Task{
				Type: "TEST2",
			}
			go func() {
				time.Sleep(time.Millisecond * 200)
				t := Shift()
				g.Assert(t.Type).Equal("TEST2")
				g.Assert(*(t.rotten)).Equal(true)
				g.Assert(len(shiftQueue)).Equal(0)
				g.Assert(len(mainQueue)).Equal(0)
				g.Assert(len(extraQueue)).Equal(0)
			}()
			now := time.Now()
			res, err := PushAndGetResult(t, time.Millisecond*100)
			g.Assert(res).Equal(nil)
			g.Assert(err).Equal(errTimeout)
			dur := time.Now().Sub(now)
			g.Assert(time.Millisecond*100 <= dur && dur < time.Millisecond*200).IsTrue()
			time.Sleep(time.Millisecond * 300)
		})
	})
}
