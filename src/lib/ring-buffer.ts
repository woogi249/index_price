export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private _size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this._size < this.capacity) this._size++;
  }

  toArray(): T[] {
    if (this._size === 0) return [];
    const result: T[] = [];
    const start = this._size < this.capacity ? 0 : this.head;
    for (let i = 0; i < this._size; i++) {
      result.push(this.buffer[(start + i) % this.capacity] as T);
    }
    return result;
  }

  average(fn: (item: T) => number): number {
    if (this._size === 0) return 0;
    let sum = 0;
    const start = this._size < this.capacity ? 0 : this.head;
    for (let i = 0; i < this._size; i++) {
      sum += fn(this.buffer[(start + i) % this.capacity] as T);
    }
    return sum / this._size;
  }

  last(): T | undefined {
    if (this._size === 0) return undefined;
    return this.buffer[(this.head - 1 + this.capacity) % this.capacity];
  }

  get length(): number {
    return this._size;
  }
}
