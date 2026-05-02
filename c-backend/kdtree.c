#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <float.h>
#include "kdtree.h"

Node* root = NULL;
int totalDrivers = 0;

// Helper
int arePointsSame(int p1[K], int p2[K]) {
    for (int i = 0; i < K; ++i) {
        if (p1[i] != p2[i]) return 0;
    }
    return 1;
}

// Create Node
Node* newNode(int coords[K]) {
    Node* n = (Node*)malloc(sizeof(Node));
    for (int i = 0; i < K; i++) {
        n->point[i] = coords[i];
    }
    n->left = n->right = NULL;
    return n;
}

// Insert
Node* insert(Node* root, int coords[K], int depth) {
    if (root == NULL) {
        return newNode(coords);
    }
    int axis = depth % K;
    if (coords[axis] < root->point[axis]) {
        root->left = insert(root->left, coords, depth + 1);
    } else {
        root->right = insert(root->right, coords, depth + 1);
    }
    return root;
}

// Find minimum
Node* minNode(Node* x, Node* y, Node* z, int d) {
    Node* res = x;
    if (y != NULL && y->point[d] < res->point[d])
       res = y;
    if (z != NULL && z->point[d] < res->point[d])
       res = z;
    return res;
}

Node* findMin(Node* root, int d, int depth) {
    if (root == NULL)
        return NULL;
    int cd = depth % K;
    if (cd == d) {
        if (root->left == NULL)
            return root;
        return findMin(root->left, d, depth + 1);
    }
    return minNode(root,
               findMin(root->left, d, depth + 1),
               findMin(root->right, d, depth + 1), d);
}

// Delete helper with tracking
Node* deleteNodeInternal(Node* root, int point[K], int depth, int* deleted) {
    if (root == NULL) return NULL;

    int cd = depth % K;

    if (arePointsSame(root->point, point)) {
        *deleted = 1;
        if (root->right != NULL) {
            Node* min = findMin(root->right, cd, depth + 1);
            for (int i = 0; i < K; i++) root->point[i] = min->point[i];
            root->right = deleteNodeInternal(root->right, min->point, depth + 1, deleted);
        } else if (root->left != NULL) {
            Node* min = findMin(root->left, cd, depth + 1);
            for (int i = 0; i < K; i++) root->point[i] = min->point[i];
            root->right = deleteNodeInternal(root->left, min->point, depth + 1, deleted);
            root->left = NULL;
        } else {
            free(root);
            return NULL;
        }
        return root;
    }

    if (point[cd] < root->point[cd]) {
        root->left = deleteNodeInternal(root->left, point, depth + 1, deleted);
    } else {
        root->right = deleteNodeInternal(root->right, point, depth + 1, deleted);
    }
    return root;
}

Node* deleteNode(Node* root, int point[K], int depth) {
    int deleted = 0;
    return deleteNodeInternal(root, point, depth, &deleted);
}

// Distance function
double distanceSquared(int p1[K], int p2[K]) {
    double sum = 0;
    for (int i = 0; i < K; i++) {
        double diff = (double)p1[i] - (double)p2[i];
        sum += diff * diff;
    }
    return sum;
}

// Nearest Neighbor
void nearest(Node* root, int target[K], int bestPoint[K], double* bestDistSq, int depth) {
    if (root == NULL) return;

    double d = distanceSquared(root->point, target);

    if (d < *bestDistSq) {
        *bestDistSq = d;
        for (int i = 0; i < K; i++) bestPoint[i] = root->point[i];
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

    nearest(nextBranch, target, bestPoint, bestDistSq, depth + 1);

    double diff = (double)target[axis] - (double)root->point[axis];
    if (diff * diff < *bestDistSq) {
        nearest(otherBranch, target, bestPoint, bestDistSq, depth + 1);
    }
}

// Range Search
void radiusSearch(Node* root, int target[K], double radius, int depth, int results[][K], int* count) {
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
    int deleted = 0;
    root = deleteNodeInternal(root, point, 0, &deleted);
    if (deleted) totalDrivers--;
    return deleted;
}

int findNearestDriver(int point[K], int outPoint[K], double* outDist) {
    if (totalDrivers == 0 || root == NULL) {
        return 0;
    }
    double bestDistSq = DBL_MAX;
    nearest(root, point, outPoint, &bestDistSq, 0);
    *outDist = sqrt(bestDistSq);
    return 1;
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