# ESP32 Environment Monitor

An environmental monitoring system developed with ESP32, ESP-IDF, and FreeRTOS.

## Current milestone

The starter application creates a FreeRTOS task that prints a placeholder sensor
sample every two seconds. No physical board or sensor is required to compile it.
Real sensor drivers will be added after the hardware is selected.

## Requirements

- ESP-IDF v6.0.2
- The stable `release-v6.0` ESP-IDF PowerShell environment

## Build without a board

Open `IDF_release-v6.0_Powershell`, enter the repository, and run:

```powershell
cd "C:\Users\aal40\Documents\Codex\2026-08-16\i\esp32-environment-monitor"
idf.py set-target esp32
idf.py build
```

The generated firmware files will be placed in `build/`. Building proves that
the source code and ESP-IDF toolchain work; flashing requires a physical board.

## Commands for later hardware testing

After connecting a compatible ESP32 board by USB:

```powershell
idf.py flash
idf.py monitor
```

Exit the serial monitor with `Ctrl+]`.
