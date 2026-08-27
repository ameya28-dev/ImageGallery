# Release vs Debug Mode

By default, the Image Gallery runs in **debug mode** for development convenience (VSCode JDWP debugging, Node inspect). For performance testing, use **release mode**.

## Quick Start

### Debug Mode (Default)
```bash
# Local profile
./scripts/local/up.sh

# Feature profile
./scripts/feature/up.sh
```

**Features:**
- ✅ Java JDWP debugging on port 5005
- ✅ Node.js inspect on port 9229
- ✅ Full source maps
- ⚠️ ~5-10% performance overhead from debugging

**Use for:** Development, step-through debugging, quick testing

---

### Release Mode (Optimized)
```bash
# Local profile
./scripts/local/up-release.sh

# Feature profile
./scripts/feature/up-release.sh
```

**Features:**
- ✅ No JDWP overhead
- ✅ No Node inspect overhead
- ✅ Production-like performance
- ✅ Same functionality, just faster

**Use for:** Performance testing, load testing, production parity checks

---

## Performance Impact

Debug mode adds overhead from:
- **Java JDWP**: ~3-5% (debugger listening, breakpoint checks)
- **Node inspect**: ~2-5% (inspector overhead, source maps)
- **Combined**: ~5-10% total overhead

Release mode removes all of this, giving you **true production-like performance**.

---

## Switching Between Modes

You can switch anytime without data loss (both use the same volumes/databases):

```bash
# Currently in debug mode, switch to release
./scripts/local/down.sh
./scripts/local/up-release.sh

# Back to debug mode
./scripts/local/down.sh
./scripts/local/up.sh
```

---

## Benchmarking Tips

For accurate performance testing:
1. **Use release mode** (`up-release.sh`)
2. **Warm up** — make a few requests first (JVM JIT compilation, caching)
3. **Measure** — run your load test / benchmarks
4. **Check logs** — `./scripts/local/logs.sh` to verify no errors
5. **Use Swagger** — `http://localhost:8000/swagger-ui.html` to test individual endpoints

---

## Technical Details

**Debug Mode Compose Setup** (`compose.override.yaml`):
```yaml
backend:
  environment:
    JAVA_TOOL_OPTIONS: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
  ports:
    - "5005:5005"

frontend:
  environment:
    NODE_OPTIONS: "--inspect=0.0.0.0:9229"
  ports:
    - "9229:9229"
```

**Release Mode Compose Setup** (`compose.release.override.yaml`):
```yaml
backend:
  environment:
    JAVA_TOOL_OPTIONS: ""  # Disabled
  ports: []                # Debug port removed

frontend:
  environment:
    NODE_OPTIONS: ""       # Disabled
  ports: []                # Debug port removed
```

Both modes use the same application code and configuration—only debug features differ.
