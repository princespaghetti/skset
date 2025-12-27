# Test Fixtures

Sample skills for testing validation and operations.

## Valid Skills

- `valid-skill/` - A properly formatted skill that passes all validation

## Invalid Skills

- `invalid-name-uppercase/` - Has uppercase letters in name (should fail validation)
- `invalid-no-description/` - Missing required description field
- `invalid-no-skillmd/` - Directory with no SKILL.md file
- `oversized-skill/` - SKILL.md exceeds 500 lines (should trigger warnings)
