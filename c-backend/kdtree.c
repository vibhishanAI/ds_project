#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <float.h>
#include "kdtree.h"

Node* root = NULL;
int totalDrivers = 0;

// Create Node
Node* createNode(int point[]) {
    Node* newNode = (Node*)malloc(sizeof(Node));
    for (int i = 0; i < K; i++) {
        newNode->point[i] = point[i];
    }
    newNode->left = NULL;
    newNode->right = NULL;
    return newNode;
}

// Insert
Node* insert(Node* root, int point[], int depth) {
    if (root == NULL) {
        return createNode(point);
    }
    int axis = depth % K;
    if (point[axis] < root->point[axis]) {
        root->left = insert(root->left, point, depth + 1);
    } else {
        root->right = insert(root->right, point, depth + 1);
    }
    return root;
}

// Find Minimum
Node* findMin(Node* root, int d, int depth) {
    if (root == NULL)
        return NULL;

    int axis = depth % K;

    if (axis == d) {
        if (root->left == NULL)
            return root;
        return findMin(root->left, d, depth + 1);
    }

    Node* leftMin = findMin(root->left, d, depth + 1);
    Node* rightMin = findMin(root->right, d, depth + 1);

    Node* min = root;

    if (leftMin && leftMin->point[d] < min->point[d])
        min = leftMin;

    if (rightMin && rightMin->point[d] < min->point[d])
        min = rightMin;

    return min;
}

// Delete
Node* deleteNode(Node* root, int point[], int depth) {
    if (root == NULL)
        return NULL;

    int axis = depth % K;

    if (root->point[0] == point[0] && root->point[1] == point[1]) {
        if (root->right != NULL) {
            Node* min = findMin(root->right, axis, depth + 1);
            root->point[0] = min->point[0];
            root->point[1] = min->point[1];
            root->right = deleteNode(root->right, min->point, depth + 1);
        } else if (root->left != NULL) {
            Node* min = findMin(root->left, axis, depth + 1);
            root->point[0] = min->point[0];
            root->point[1] = min->point[1];
            root->right = deleteNode(root->left, min->point, depth + 1);
            root->left = NULL;
        } else {
            free(root);
            return NULL;
        }
        return root;
    }

    if (point[axis] < root->point[axis])
        root->left = deleteNode(root->left, point, depth + 1);
    else
        root->right = deleteNode(root->right, point, depth + 1);

    return root;
}

// Distance function
double distanceSquared(int p1[], int p2[]) {
    double dx = p1[0] - p2[0];
    double dy = p1[1] - p2[1];
    return dx*dx + dy*dy;
}

// Nearest Neighbor
void nearestNeighbor(Node* root, int target[], int depth, Node** best, double* bestDist) {
    if (root == NULL)
        return;

    double d = distanceSquared(root->point, target);

    if (d < *bestDist) {
        *bestDist = d;
        *best = root;
    }

    int axis = depth % K;

    Node *nextBranch, *otherBranch;

    if (target[axis] < root->point[axis]) {
        nextBranch = root->left;
        otherBranch = root->right;
    } else {
        nextBranch = root->right;
        otherBranch = root->left;
    }

    nearestNeighbor(nextBranch, target, depth + 1, best, bestDist);

    double diff = target[axis] - root->point[axis];

    if (diff * diff < *bestDist) {
        nearestNeighbor(otherBranch, target, depth + 1, best, bestDist);
    }
}

// Range Search
void radiusSearch(Node* root, int target[], double radius, int depth, int results[][K], int* count) {
    if (root == NULL) return;

    double dSq = distanceSquared(root->point, target);

    if (dSq <= radius * radius) {
        for (int i = 0; i < K; i++) results[*count][i] = root->point[i];
        (*count)++;
    }

    int axis = depth % K;

    if ((double)target[axis] - radius <= (double)root->point[axis]) {
        radiusSearch(root->left, target, radius, depth + 1, results, count);
    }
    if ((double)target[axis] + radius >= (double)root->point[axis]) {
        radiusSearch(root->right, target, radius, depth + 1, results, count);
    }
}

// Free tree
void freeTree(Node* root) {
    if (root == NULL) return;
    freeTree(root->left);
    freeTree(root->right);
    free(root);
}

// Collect all
void collectAll(Node* root, int outPoints[][K], int* count) {
    if (root == NULL) return;
    for (int i = 0; i < K; i++) outPoints[*count][i] = root->point[i];
    (*count)++;
    collectAll(root->left, outPoints, count);
    collectAll(root->right, outPoints, count);
}

// ---------- Driver Management ----------

int addDriver(int point[K]) {
    if (totalDrivers >= MAX_DRIVERS) return -1;
    root = insert(root, point, 0);
    totalDrivers++;
    return 1;
}

int removeDriver(int point[K]) {
    if (totalDrivers <= 0) return 0;
    
    Node* best = NULL;
    double bestDist = DBL_MAX;
    nearestNeighbor(root, point, 0, &best, &bestDist);
    
    if (best != NULL && bestDist == 0.0) {
        root = deleteNode(root, point, 0);
        totalDrivers--;
        return 1;
    }
    return 0;
}

int findNearestDriver(int point[K], int outPoint[K], double* outDist) {
    if (totalDrivers == 0 || root == NULL) {
        return 0;
    }
    Node* best = NULL;
    double bestDistSq = DBL_MAX;
    nearestNeighbor(root, point, 0, &best, &bestDistSq);
    if (best != NULL) {
        for (int i = 0; i < K; i++) outPoint[i] = best->point[i];
        *outDist = sqrt(bestDistSq);
        return 1;
    }
    return 0;
}

int findDriversInRadius(int point[K], double radius, int outPoints[][K]) {
    if (totalDrivers == 0 || root == NULL) return 0;
    int count = 0;
    radiusSearch(root, point, radius, 0, outPoints, &count);
    return count;
}

int getDriverCount(void) {
    return totalDrivers;
}

void getAllDrivers(int outPoints[][K], int* count) {
    *count = 0;
    collectAll(root, outPoints, count);
}
