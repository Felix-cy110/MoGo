#import "MoGoNativeModule.h"
#import <React/RCTBridgeModule.h>
#include "mogo/native/native_core.hpp"
#include <atomic>
#include <memory>
#include <stdexcept>

@implementation MoGoNativeModule {
    dispatch_queue_t _worker;
    std::atomic_bool _invalidated;
    std::unique_ptr<mogo::native::NativeCore> _core;
}
RCT_EXPORT_MODULE(NativeMoGo)
+ (BOOL)requiresMainQueueSetup { return NO; }
- (instancetype)init {
    if ((self = [super init])) _worker = dispatch_queue_create("com.mogo.native-core", DISPATCH_QUEUE_SERIAL);
    return self;
}
- (void)execute:(NSString *)method payload:(NSString *)payload resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(_worker, ^{
        try {
            if (self->_invalidated.load()) throw std::runtime_error("Native module is invalidated");
            if (!self->_core) {
                NSURL *base = [[NSFileManager defaultManager] URLForDirectory:NSApplicationSupportDirectory
                    inDomain:NSUserDomainMask appropriateForURL:nil create:YES error:nil];
                if (!base) throw std::runtime_error("Private storage is unavailable");
                self->_core = std::make_unique<mogo::native::NativeCore>([[base URLByAppendingPathComponent:@"MoGo"] path].UTF8String);
            }
            const auto response = self->_core->execute(method.UTF8String, payload.UTF8String);
            resolve([[NSString alloc] initWithBytes:response.data() length:response.size() encoding:NSUTF8StringEncoding]);
        } catch (const std::exception&) {
            reject(@"NATIVE_STORAGE_FAILED", @"Native storage failed", nil);
        }
    });
}
- (void)invalidate {
    if (!_invalidated.exchange(true)) {
        // Release after queued IO; a reload must not retain the old SQLite handle.
        dispatch_async(_worker, ^{ self->_core.reset(); });
    }
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeMoGoSpecJSI>(params);
}
@end
