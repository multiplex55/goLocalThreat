package store

import "golocalthreat/internal/domain"

func ValidateSettings(s domain.Settings) error {
	return s.Validate()
}
