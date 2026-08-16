#include <inttypes.h>

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "env_monitor";

static void environment_monitor_task(void *argument)
{
    (void)argument;
    uint32_t sample_number = 1;

    while (true) {
        ESP_LOGI(TAG, "Placeholder environment sample #%" PRIu32, sample_number);
        sample_number++;
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}

void app_main(void)
{
    ESP_LOGI(TAG, "Starting ESP32 environment monitor");

    BaseType_t task_created = xTaskCreate(
        environment_monitor_task,
        "environment_monitor",
        3072,
        NULL,
        5,
        NULL
    );

    if (task_created != pdPASS) {
        ESP_LOGE(TAG, "Failed to create environment monitor task");
    }
}
