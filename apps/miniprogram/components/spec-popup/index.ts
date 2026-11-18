import { fen } from '../../utils/format';

interface OptionVM {
  id: string;
  name: string;
  priceText: string;
  selected: boolean;
}

interface GroupVM {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  options: OptionVM[];
}

Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    show: { type: Boolean, value: false },
    product: { type: Object, value: null },
  },

  data: {
    groups: [] as GroupVM[],
    quantity: 1,
    totalFen: 0,
    totalText: '0.00',
    imageUrl: '',
    productName: '',
    description: '',
    soldOut: false,
  },

  observers: {
    'product, show'(product: any, show: boolean) {
      if (!show || !product) return;
      this.init(product);
    },
  },

  methods: {
    init(product: any) {
      const groups: GroupVM[] = (product.specGroups || []).map((group: any) => {
        const selected: string[] = (group.options || [])
          .filter((option: any) => option.defaultSelected)
          .map((option: any) => option.id);

        const groupVM: GroupVM = {
          id: group.id,
          name: group.name,
          required: Boolean(group.required),
          multiple: Boolean(group.multiple),
          options: (group.options || []).map((option: any) => ({
            id: option.id,
            name: option.name,
            priceText: option.priceDelta > 0 ? `+${fen(option.priceDelta)}` : '',
            selected: selected.indexOf(option.id) >= 0,
          })),
        };

        if (selected.length === 0 && group.required && !group.multiple && groupVM.options.length > 0) {
          groupVM.options[0].selected = true;
        }
        return groupVM;
      });

      this.setData(
        {
          groups,
          quantity: 1,
          imageUrl: product.imageUrl || '',
          productName: product.name,
          description: product.description || '',
          soldOut: Boolean(product.soldOut),
        },
        () => this.recalc(),
      );
    },

    recalc() {
      const product = this.data.product as any;
      if (!product) return;
      let delta = 0;
      this.data.groups.forEach((group) => {
        group.options.forEach((option) => {
          if (!option.selected) return;
          const origin = (product.specGroups || [])
            .find((item: any) => item.id === group.id)
            ?.options.find((item: any) => item.id === option.id);
          delta += (origin && origin.priceDelta) || 0;
        });
      });
      const totalFen = (product.price + delta) * this.data.quantity;
      this.setData({ totalFen, totalText: fen(totalFen) });
    },

    onOptionTap(e: any) {
      const { groupIndex, optionIndex } = e.currentTarget.dataset;
      const group = this.data.groups[groupIndex];
      if (!group) return;

      const groups = this.data.groups.map((item, index) => {
        if (index !== groupIndex) return item;
        const options = item.options.map((option, optIndex) => {
          if (optIndex !== optionIndex) {
            return item.multiple ? option : { ...option, selected: false };
          }
          return { ...option, selected: item.multiple ? !option.selected : true };
        });
        return { ...item, options };
      });

      this.setData({ groups }, () => this.recalc());
      wx.vibrateShort({ type: 'light' });
    },

    inc() {
      if (this.data.quantity >= 99) return;
      this.setData({ quantity: this.data.quantity + 1 }, () => this.recalc());
    },

    dec() {
      if (this.data.quantity <= 1) return;
      this.setData({ quantity: this.data.quantity - 1 }, () => this.recalc());
    },

    close() {
      this.triggerEvent('close');
    },

    noop() {},

    confirm() {
      const product = this.data.product as any;
      if (!product) return;
      if (this.data.soldOut) {
        wx.showToast({ title: '该菜品已售罄', icon: 'none' });
        return;
      }

      for (const group of this.data.groups) {
        const picked = group.options.filter((option) => option.selected);
        if (group.required && picked.length === 0) {
          wx.showToast({ title: `请选择${group.name}`, icon: 'none' });
          return;
        }
      }

      const specOptionIds: string[] = [];
      const specParts: string[] = [];
      this.data.groups.forEach((group) => {
        const names = group.options.filter((option) => option.selected).map((option) => option.name);
        if (names.length) {
          specParts.push(`${group.name}:${names.join('+')}`);
          group.options.forEach((option) => {
            if (option.selected) specOptionIds.push(option.id);
          });
        }
      });

      let delta = 0;
      this.data.groups.forEach((group) => {
        group.options.forEach((option) => {
          if (!option.selected) return;
          const origin = (product.specGroups || [])
            .find((item: any) => item.id === group.id)
            ?.options.find((item: any) => item.id === option.id);
          delta += (origin && origin.priceDelta) || 0;
        });
      });

      this.triggerEvent('confirm', {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl || '',
        basePrice: product.price,
        unitPrice: product.price + delta,
        quantity: this.data.quantity,
        specOptionIds,
        specText: specParts.join(' / '),
      });
      this.close();
    },
  },
});
