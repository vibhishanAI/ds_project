#ifndef KDTREE_H
#define KDTREE_H

#define MAX_DRIVERS 100
#define K 2

typedef struct Node {
    int point[K];
    struct Node *left, *right;
} Node;

// KD-tree operations
Node* newNode(int coords[K]);
Node* insert(Node* root, int coords[K], int depth);
Node* deleteNode(Node* root, int coords[K], int depth);
void nearest(Node* root, int target[K], int bestPoint[K], double* bestDistSq, int depth);
void radiusSearch(Node* root, int target[K], double radius, int depth, int results[][K], int* count);
void freeTree(Node* root);

// Driver management
int addDriver(int point[K]);
int removeDriver(int point[K]);
int findNearestDriver(int point[K], int outPoint[K], double* outDist);
int findDriversInRadius(int point[K], double radius, int outPoints[][K]);
int getDriverCount(void);
void getAllDrivers(int outPoints[][K], int* count);

// Global state
extern Node* root;
extern int totalDrivers;

#endif
