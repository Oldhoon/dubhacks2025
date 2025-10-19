
void level1() {
    int x = 1;
    x = x + 1;
    int y = x;
    x = 0;
}

void level2() {
    char x = 1;

    char * p_x = &x;
    
    *p_x = 4;
    x = 2;

}

void level3() {
    short y = 2;

    short * p_y = &y;

    short z = *p_y;
    z = 0;
}

void level4() {
    char trees[4] = {0, 1, 2, 3};

    trees[0] = 0;
    trees[1] = 1;
    trees[2] = 2;
    trees[3] = 3;


    trees[1] = trees[3];
    trees[3] = 1;
}