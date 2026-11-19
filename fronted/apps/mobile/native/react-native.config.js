module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.mogo.nativecore.MoGoNativePackage;',
        packageInstance: 'new MoGoNativePackage()',
      },
      ios: { podspecPath: './MoGoNative.podspec' },
    },
  },
};
