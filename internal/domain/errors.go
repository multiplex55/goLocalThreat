package domain

import (
	"errors"
	"fmt"
)

var ErrRateLimited = errors.New("rate limited")

type UnresolvedNameError struct {
	Name string
}

func (e UnresolvedNameError) Error() string {
	return fmt.Sprintf("unresolved name: %s", e.Name)
}

type PartialBatchError struct {
	Operation string
	FailedIDs []int64
}

func (e PartialBatchError) Error() string {
	return fmt.Sprintf("partial batch failure for %s", e.Operation)
}

func IsRateLimited(err error) bool {
	return errors.Is(err, ErrRateLimited)
}
