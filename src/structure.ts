export class SLList {
        items: any[] = [];
    
        constructor(items: any[]) {
            this.items = items;
        }
    
        toString() {
            return "[" + this.items.map(item => item.toString()).join(", ") + "]";
        }

        add(item: any): SLList {
            if (item instanceof SLList) {
                this.items.push(...item.items);
            } else {
                this.items.push(item);
            }

            return this;
        }
}

export class SLRotation {
    x: number;
    y: number;
    z: number;
    s: number;

    constructor(x: number, y: number, z: number, s: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.s = s;
    }
}

export class SLVector {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toString() {
        return `<${this.x}, ${this.y}, ${this.z}>`;
    }

    add(other: SLVector): SLVector {
        return new SLVector(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    mul(value: number | SLVector | SLRotation): SLVector {
         if (typeof value === 'number') {
            return new SLVector(this.x * value, this.y * value, this.z * value);
        } else if (value instanceof SLVector) {
            return new SLVector(this.x * value.x, this.y * value.y, this.z * value.z);
        }
        
        return this;
    }
}