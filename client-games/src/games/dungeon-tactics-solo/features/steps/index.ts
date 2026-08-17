// Barrel that registers every shared step-definition module with quickpickle.
// Imported once via vitest.config.mts's `test.setupFiles`, so every `.feature`
// file under this directory shares the same step library — no step-definition
// file per `.feature` file.
import './pc.steps'
