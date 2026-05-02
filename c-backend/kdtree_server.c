#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "kdtree.h"

/*
 * KD-Tree IPC Server
 * Reads commands from stdin, writes JSON responses to stdout.
 *
 * Protocol:
 *   ADD|x|y       -> {"status":"ok","point":[X,Y]}
 *   FIND|x|y      -> {"status":"ok","point":[X,Y],"distance":D}
 *   REMOVE|x|y    -> {"status":"ok","removed":1}
 *   LIST          -> {"status":"ok","count":N,"drivers":[{"point":[X,Y]}]}
 *   RANGE|x|y|r   -> {"status":"ok","count":N,"results":[{"point":[X,Y]}]}
 *   CLEAR         -> {"status":"ok"}
 *   EXIT          -> (terminates)
 */

void handleAdd(char* args) {
    double x, y;
    if (sscanf(args, "%lf|%lf", &x, &y) != 2) {
        printf("{\"status\":\"error\",\"message\":\"Invalid ADD args\"}\n");
        fflush(stdout);
        return;
    }

    int point[K] = {(int)x, (int)y};
    int res = addDriver(point);
    if (res < 0) {
        printf("{\"status\":\"error\",\"message\":\"Max drivers reached\"}\n");
    } else {
        printf("{\"status\":\"ok\",\"point\":[%d,%d]}\n", point[0], point[1]);
    }
    fflush(stdout);
}

void handleFind(char* args) {
    double x, y;
    if (sscanf(args, "%lf|%lf", &x, &y) != 2) {
        printf("{\"status\":\"error\",\"message\":\"Invalid FIND args\"}\n");
        fflush(stdout);
        return;
    }

    int target[K] = {(int)x, (int)y};
    int foundPoint[K];
    double dist;
    
    if (findNearestDriver(target, foundPoint, &dist)) {
        printf("{\"status\":\"ok\",\"point\":[%d,%d],\"distance\":%.2f}\n",
               foundPoint[0], foundPoint[1], dist);
    } else {
        printf("{\"status\":\"error\",\"message\":\"No drivers available\"}\n");
    }
    fflush(stdout);
}

void handleRemove(char* args) {
    double x, y;
    if (sscanf(args, "%lf|%lf", &x, &y) != 2) {
        printf("{\"status\":\"error\",\"message\":\"Invalid REMOVE args\"}\n");
        fflush(stdout);
        return;
    }

    int target[K] = {(int)x, (int)y};
    int result = removeDriver(target);
    printf("{\"status\":\"ok\",\"removed\":%d}\n", result);
    fflush(stdout);
}

void handleList() {
    int activeCount = getDriverCount();
    printf("{\"status\":\"ok\",\"count\":%d,\"drivers\":[", activeCount);

    if (activeCount > 0) {
        int points[MAX_DRIVERS][K];
        int count = 0;
        getAllDrivers(points, &count);
        
        for (int i = 0; i < count; i++) {
            if (i > 0) printf(",");
            printf("{\"point\":[%d,%d]}", points[i][0], points[i][1]);
        }
    }

    printf("]}\n");
    fflush(stdout);
}

void handleRange(char* args) {
    double x, y, radius;
    if (sscanf(args, "%lf|%lf|%lf", &x, &y, &radius) != 3) {
        printf("{\"status\":\"error\",\"message\":\"Invalid RANGE args\"}\n");
        fflush(stdout);
        return;
    }

    int target[K] = {(int)x, (int)y};
    int points[MAX_DRIVERS][K];
    int count = findDriversInRadius(target, radius, points);

    printf("{\"status\":\"ok\",\"count\":%d,\"results\":[", count);
    for (int i = 0; i < count; i++) {
        if (i > 0) printf(",");
        printf("{\"point\":[%d,%d]}", points[i][0], points[i][1]);
    }
    printf("]}\n");
    fflush(stdout);
}

void handleClear() {
    freeTree(root);
    root = NULL;
    totalDrivers = 0;
    printf("{\"status\":\"ok\"}\n");
    fflush(stdout);
}

int main() {
    char line[256];

    // Signal ready
    printf("{\"status\":\"ready\"}\n");
    fflush(stdout);

    while (fgets(line, sizeof(line), stdin)) {
        // Strip newline
        line[strcspn(line, "\r\n")] = 0;

        if (strlen(line) == 0) continue;

        // Parse command
        char* cmd = strtok(line, "|");
        char* args = cmd + strlen(cmd) + 1;

        if (strcmp(cmd, "ADD") == 0) {
            handleAdd(args);
        } else if (strcmp(cmd, "FIND") == 0) {
            handleFind(args);
        } else if (strcmp(cmd, "REMOVE") == 0) {
            handleRemove(args);
        } else if (strcmp(cmd, "LIST") == 0) {
            handleList();
        } else if (strcmp(cmd, "RANGE") == 0) {
            handleRange(args);
        } else if (strcmp(cmd, "CLEAR") == 0) {
            handleClear();
        } else if (strcmp(cmd, "EXIT") == 0) {
            break;
        } else {
            printf("{\"status\":\"error\",\"message\":\"Unknown command\"}\n");
            fflush(stdout);
        }
    }

    return 0;
}
