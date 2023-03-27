## snapshots

This is for low-fi html tweaking. Run the validation-email.test.js and it will write the latest html for that page here, so you can tweak it.

```sh
# writes ./validation-email.html 
$ pnpm test test/validate-email.test.js

# peep it. tweak it.
$ open test/snapshots/validate-email.html
```

The html will change on every run, as we include ucan info.

Full snapshot testing is not considered here as it is dull.

A storybook for this project would be decent tho.

⁂