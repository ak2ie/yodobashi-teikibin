declare namespace chrome.storage {
    export interface StorageArea {
        set: JestMock;
        get: JestMock;
    }
}

interface JestMock {
    mock: JestMockCalls;
    (items: Object, callback?: () => void): void;
    (keys: string | string[] | Object | null, callback: (items: { [key: string]: any }) => void): void;
    (callback: (items: { [key: string]: any }) => void): void;
    mockImplementation(param: (key: any, callback: (items: { [key: string]: any }) => void) => void): void;
}

interface JestMockCalls {
    calls: string[][];
    mockReturnValue(param: any): void;
}

interface SendMessageJestMock {
    mock: JestMockCalls
}

declare namespace chrome.tabs {
    export function sendMessage(): SendMessageJestMock;
    export function sendMessage(tabId: number, message: any, responseCallback?: (response: any) => void): void;
    export function sendMessage(tabId: number, message: any, options: MessageSendOptions, responseCallback?: (response: any) => void): void;
}

declare namespace chrome.notifications {
    export interface t {
        create: {
            mock: JestMock;
        }
    }
    export function create(notificationId: string, options: NotificationOptions, callback?: (notificationId: string) => void): NotificationMock;
}

interface NotificationMock {
    mock: JestMockCalls
}