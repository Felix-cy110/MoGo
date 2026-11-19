package com.mogo.nativecore

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicBoolean

@ReactModule(name = MoGoNativeModule.NAME)
class MoGoNativeModule(context: ReactApplicationContext) : NativeMoGoSpec(context) {
    companion object {
        const val NAME = "NativeMoGo"
        init { System.loadLibrary("mogo_mobile_jni") }
    }
    private val worker = Executors.newSingleThreadExecutor()
    private val directory = File(context.filesDir, "mogo").absolutePath
    private val invalidated = AtomicBoolean(false)
    private var handle = 0L
    private external fun nativeCreate(directory: String): Long
    private external fun nativeExecute(handle: Long, method: String, payload: String): String
    private external fun nativeDestroy(handle: Long)
    override fun getName() = NAME

    override fun execute(method: String, payload: String, promise: Promise) {
        try {
            // SQLite and file IO never run on the JS/UI thread. The same queue owns the handle.
            worker.execute {
                try {
                    check(!invalidated.get()) { "Native module is invalidated" }
                    if (handle == 0L) handle = nativeCreate(directory)
                    promise.resolve(nativeExecute(handle, method, payload))
                } catch (error: Exception) {
                    promise.reject("NATIVE_STORAGE_FAILED", error)
                }
            }
        } catch (error: RejectedExecutionException) {
            promise.reject("NATIVE_UNAVAILABLE", error)
        }
    }

    override fun invalidate() {
        if (invalidated.compareAndSet(false, true)) {
            worker.execute { if (handle != 0L) { nativeDestroy(handle); handle = 0L } }
            worker.shutdown()
        }
        super.invalidate()
    }
}
