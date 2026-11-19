# Preserve the explicit JNI symbol names when enabling R8.
-keepclasseswithmembernames class com.mogo.nativecore.MoGoNativeModule {
    native <methods>;
}
