declare module 'bullmq' {
  export class Queue {
    constructor(name: string, options: any);
    add(name: string, data: any, options: any): Promise<any>;
    getRepeatableJobs(): Promise<any[]>;
    removeRepeatableByKey(key: string): Promise<any>;
  }

  export class Worker {
    constructor(name: string, processor: any, options: any);
    on(event: string, callback: any): void;
    close(): Promise<any>;
  }

  export class QueueScheduler {
    constructor(name: string, options: any);
  }
}

declare namespace jest {
  interface Mock<T = any> {
    mockResolvedValue(value: any): Mock<T>;
    mockRejectedValue(value: any): Mock<T>;
    mockImplementation(fn: any): Mock<T>;
  }

  function fn<T = any>(implementation?: (...args: any[]) => any): Mock<T>;
  function clearAllMocks(): void;
}