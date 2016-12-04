package rgx

import "regexp"

type Rgx struct {
	*regexp.Regexp
}

func New(pattern string) Rgx {
	return Rgx{regexp.MustCompile(pattern)}
}

func (r *Rgx) FindStringSubmatchMap(s string) (map[string]string, bool) {
	captures := make(map[string]string)

	match := r.FindStringSubmatch(s)
	if match == nil {
		return captures, false
	}

	for i, name := range r.SubexpNames() {
		// Ignore the whole regexp match and unnamed groups
		if i == 0 || name == "" {
			continue
		}

		captures[name] = match[i]

	}
	return captures, true
}
