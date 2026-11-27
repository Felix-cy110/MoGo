#import "MoGoNativeModule.h"
#import <React/RCTBridgeModule.h>
#include "mogo/native/native_core.hpp"
#include <atomic>
#include <memory>
#include <stdexcept>

static const NSUInteger MoGoMaxBackupBytes = 350UL * 1024UL * 1024UL;

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
- (void)writeBackupFile:(NSString *)fileName content:(NSString *)content resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(_worker, ^{
        @try {
            if (self->_invalidated.load()) @throw [NSException exceptionWithName:@"MoGoInvalidated" reason:@"Native module is invalidated" userInfo:nil];
            if (![[fileName lastPathComponent] isEqualToString:fileName] || ![[fileName pathExtension] isEqualToString:@"mogo"]) {
                @throw [NSException exceptionWithName:@"MoGoFileName" reason:@"Invalid backup file name" userInfo:nil];
            }
            NSURL *directory = [[[NSFileManager defaultManager] URLsForDirectory:NSCachesDirectory inDomains:NSUserDomainMask] firstObject];
            directory = [directory URLByAppendingPathComponent:@"MoGoBackups" isDirectory:YES];
            NSError *error = nil;
            [[NSFileManager defaultManager] createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:&error];
            NSURL *file = [directory URLByAppendingPathComponent:fileName];
            if (error || ![content writeToURL:file atomically:YES encoding:NSUTF8StringEncoding error:&error]) {
                @throw [NSException exceptionWithName:@"MoGoWriteFailed" reason:@"Unable to write backup file" userInfo:nil];
            }
            resolve(file.absoluteString);
        } @catch (NSException *exception) {
            reject(@"NATIVE_STORAGE_FAILED", exception.reason, nil);
        }
    });
}
- (void)readBackupFile:(NSString *)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(_worker, ^{
        NSURL *url = [NSURL URLWithString:uri];
        BOOL scoped = [url startAccessingSecurityScopedResource];
        @try {
            if (self->_invalidated.load()) @throw [NSException exceptionWithName:@"MoGoInvalidated" reason:@"Native module is invalidated" userInfo:nil];
            NSError *error = nil;
            NSData *data = [NSData dataWithContentsOfURL:url options:NSDataReadingMappedIfSafe error:&error];
            if (error || !data || data.length > MoGoMaxBackupBytes) {
                @throw [NSException exceptionWithName:@"MoGoReadFailed" reason:@"Unable to read backup file" userInfo:nil];
            }
            NSString *content = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            if (!content) @throw [NSException exceptionWithName:@"MoGoEncoding" reason:@"Invalid backup encoding" userInfo:nil];
            resolve(content);
        } @catch (NSException *exception) {
            reject(@"NATIVE_STORAGE_FAILED", exception.reason, nil);
        } @finally {
            if (scoped) [url stopAccessingSecurityScopedResource];
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
