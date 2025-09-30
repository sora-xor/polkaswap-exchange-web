(async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const updateJson = (filePath, mutate) => {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const original = JSON.stringify(json);

    mutate(json);

    const next = JSON.stringify(json);
    if (next === original) {
      return false;
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
    console.log(`[fix-peer-deps] patched ${path.relative(process.cwd(), filePath)}`);
    return true;
  };

  const relaxOpenWeb3Peer = (packageRoot) => {
    const pkgPath = path.join(packageRoot, '@open-web3', 'api-mobx', 'package.json');
    return updateJson(pkgPath, (pkg) => {
      if (!pkg.peerDependencies) {
        return;
      }
      if (pkg.peerDependencies['@polkadot/api']) {
        pkg.peerDependencies['@polkadot/api'] = '>=5.0.0';
      }
    });
  };

  const relaxViteSvgLoaderPeer = (packageRoot) => {
    const pkgPath = path.join(packageRoot, 'vite-svg-loader', 'package.json');
    return updateJson(pkgPath, (pkg) => {
      if (!pkg.peerDependencies) {
        return;
      }

      if (pkg.peerDependencies.vue) {
        pkg.peerDependencies.vue = '^2.7.14 || >=3.2.13';
      }
    });
  };

  const markWorkspacePackagesPrivate = (packageRoot, packageName) => {
    const pkgPath = path.join(packageRoot, packageName, 'package.json');
    return updateJson(pkgPath, (pkg) => {
      if (pkg.workspaces && !pkg.private) {
        pkg.private = true;
      }
    });
  };

  const nodeModules = path.join(process.cwd(), 'node_modules');
  const patched = [];

  patched.push(relaxOpenWeb3Peer(nodeModules));
  patched.push(relaxOpenWeb3Peer(path.join(nodeModules, '@sora-substrate', 'types', 'node_modules')));
  patched.push(relaxViteSvgLoaderPeer(nodeModules));
  patched.push(markWorkspacePackagesPrivate(nodeModules, 'es-toolkit'));
  patched.push(markWorkspacePackagesPrivate(nodeModules, 'unfetch'));

  if (patched.some(Boolean)) {
    console.log('[fix-peer-deps] peer metadata adjustments applied.');
  }
})();
