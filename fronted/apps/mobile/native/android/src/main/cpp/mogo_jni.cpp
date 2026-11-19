#include "mogo/native/native_core.hpp"
#include <jni.h>
#include <stdexcept>
#include <string>

namespace {
// JNI modified UTF-8 cannot represent emoji faithfully. Decode/encode through Java UTF-8 bytes.
std::string utf8(JNIEnv* env, jstring value) {
    auto string_class = env->FindClass("java/lang/String");
    auto get_bytes = env->GetMethodID(string_class, "getBytes", "(Ljava/lang/String;)[B");
    auto charset = env->NewStringUTF("UTF-8");
    auto bytes = static_cast<jbyteArray>(env->CallObjectMethod(value, get_bytes, charset));
    if (env->ExceptionCheck() || !bytes) throw std::runtime_error("String conversion failed");
    std::string result(env->GetArrayLength(bytes), '\0');
    env->GetByteArrayRegion(bytes, 0, static_cast<jsize>(result.size()), reinterpret_cast<jbyte*>(result.data()));
    env->DeleteLocalRef(bytes); env->DeleteLocalRef(charset); env->DeleteLocalRef(string_class);
    return result;
}
jstring javaString(JNIEnv* env, const std::string& value) {
    auto bytes = env->NewByteArray(static_cast<jsize>(value.size()));
    env->SetByteArrayRegion(bytes, 0, static_cast<jsize>(value.size()), reinterpret_cast<const jbyte*>(value.data()));
    auto cls = env->FindClass("java/lang/String");
    auto ctor = env->GetMethodID(cls, "<init>", "([BLjava/lang/String;)V");
    auto charset = env->NewStringUTF("UTF-8");
    auto result = static_cast<jstring>(env->NewObject(cls, ctor, bytes, charset));
    env->DeleteLocalRef(bytes); env->DeleteLocalRef(cls); env->DeleteLocalRef(charset);
    return result;
}
void fail(JNIEnv* env) {
    if (!env->ExceptionCheck()) env->ThrowNew(env->FindClass("java/lang/IllegalStateException"), "Native storage failed");
}
}
extern "C" JNIEXPORT jlong JNICALL
Java_com_mogo_nativecore_MoGoNativeModule_nativeCreate(JNIEnv* env, jobject, jstring directory) {
    try { return reinterpret_cast<jlong>(new mogo::native::NativeCore(utf8(env, directory))); }
    catch (...) { fail(env); return 0; }
}
extern "C" JNIEXPORT jstring JNICALL
Java_com_mogo_nativecore_MoGoNativeModule_nativeExecute(JNIEnv* env, jobject, jlong handle, jstring method, jstring payload) {
    try {
        if (!handle) throw std::runtime_error("Missing native handle");
        return javaString(env, reinterpret_cast<mogo::native::NativeCore*>(handle)->execute(utf8(env, method), utf8(env, payload)));
    } catch (...) { fail(env); return nullptr; }
}
extern "C" JNIEXPORT void JNICALL
Java_com_mogo_nativecore_MoGoNativeModule_nativeDestroy(JNIEnv*, jobject, jlong handle) {
    delete reinterpret_cast<mogo::native::NativeCore*>(handle);
}
